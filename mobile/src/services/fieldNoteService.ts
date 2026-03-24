import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { offlineFirstRead, isOnline } from './offlineFirst';
import { fieldNoteDBService, dogProfileDBService } from '../database/services';
import { useAuthStore } from '../stores/authStore';
import { syncEngine } from '../sync/syncEngine';
import { trainerDogScopeService } from './trainerDogScopeService';
import type { FieldNoteRow } from '../database/types';
import type { FieldNote, FieldNoteRequest } from '../types/dogManagement';

interface FieldNoteApiDto {
  noteId: number;
  trainerId?: number | null;
  trainerName?: string | null;
  dogId?: number | null;
  dogName?: string | null;
  dogCode?: string | null;
  title: string;
  content: string;
  photoUrls?: string | null;
  recordingDate?: string | null;
  location?: string | null;
  linkedContentId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const FIELD_NOTE_PAGE_SIZE = 100;

const parseServerId = (value: string | number): number | null => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const normalizeRecordedAt = (value?: string | null): string => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return new Date().toISOString();
  }

  const normalized = trimmed.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  return normalized;
};

const stringifyPhotoUrls = (mediaUrls?: string[] | null): string | null => {
  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }
  return JSON.stringify(mediaUrls);
};

const parsePhotoUrls = (photoUrls?: string | null): string[] => {
  if (!photoUrls) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(photoUrls);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object' && 'url' in item) {
          const url = (item as { url?: unknown }).url;
          return typeof url === 'string' ? url : null;
        }
        return null;
      })
      .filter((url): url is string => Boolean(url));
  } catch {
    return /^https?:\/\//i.test(photoUrls) ? [photoUrls] : [];
  }
};

const mapMediaUrls = (mediaUrls: string[]) =>
  mediaUrls.map((url, index) => ({
    mediaId: index + 1,
    url,
    type: 'IMAGE' as const,
  }));

const mapApiToFieldNote = (note: FieldNoteApiDto): FieldNote => {
  const currentUser = useAuthStore.getState().user;
  const mediaUrls = parsePhotoUrls(note.photoUrls);

  return {
    noteId: note.noteId,
    title: note.title,
    content: note.content,
    dogId: note.dogId ?? null,
    dogName: note.dogName ?? null,
    dogCode: note.dogCode ?? null,
    ownerId: note.trainerId ?? null,
    ownerName: note.trainerName ?? null,
    unitName: currentUser?.userId === note.trainerId ? currentUser?.unit ?? null : null,
    location: note.location ?? null,
    recordedAt: note.recordingDate ?? note.updatedAt ?? note.createdAt ?? null,
    photoCount: mediaUrls.length,
    category: null,
    isOwner: currentUser?.userId === note.trainerId,
    media: mapMediaUrls(mediaUrls),
    tags: null,
    syncStatus: 'SYNCED',
  };
};

const mapRowToFieldNote = async (row: FieldNoteRow): Promise<FieldNote> => {
  const currentUser = useAuthStore.getState().user;
  const mediaUrls = parsePhotoUrls(row.photo_urls);
  const dog = row.dog_id ? await dogProfileDBService.getById(row.dog_id) : null;
  const noteId: string | number = row.server_id ?? row.local_id;

  return {
    noteId,
    title: row.title,
    content: row.content,
    dogId: row.dog_id ?? null,
    dogName: dog?.dog_name ?? null,
    dogCode: dog?.dog_code ?? null,
    ownerId: row.trainer_id,
    ownerName: currentUser?.userId === row.trainer_id ? currentUser.fullName : null,
    unitName: currentUser?.userId === row.trainer_id ? currentUser.unit ?? null : null,
    location: row.location ?? null,
    recordedAt: row.recording_date,
    photoCount: mediaUrls.length,
    category: null,
    isOwner: currentUser?.userId === row.trainer_id,
    media: mapMediaUrls(mediaUrls),
    tags: null,
    syncStatus: row.sync_status,
  };
};

const resolveLocalRow = async (noteId: string | number): Promise<FieldNoteRow | null> => {
  if (typeof noteId === 'string') {
    const localRow = await fieldNoteDBService.getById(noteId);
    if (localRow) {
      return localRow;
    }
  }

  const serverId = parseServerId(noteId);
  if (serverId == null) {
    return null;
  }

  return fieldNoteDBService.getByServerId(serverId);
};

const mapApiToRow = (
  note: FieldNoteApiDto,
): Omit<FieldNoteRow, 'local_id' | 'sync_status' | 'is_deleted' | 'deleted_at'> & { server_id: number } => ({
  server_id: note.noteId,
  trainer_id: note.trainerId ?? 0,
  dog_id: note.dogId ?? null,
  title: note.title,
  content: note.content,
  photo_urls: note.photoUrls ?? null,
  recording_date: note.recordingDate ?? note.updatedAt ?? note.createdAt ?? new Date().toISOString(),
  location: note.location ?? null,
  linked_content_id: note.linkedContentId ?? null,
  created_at: note.createdAt ?? note.updatedAt ?? new Date().toISOString(),
  updated_at: note.updatedAt ?? note.createdAt ?? new Date().toISOString(),
});

const saveRemoteNotesToLocal = async (notes: FieldNote[]): Promise<void> => {
  const serverNotes = notes.filter((note): note is FieldNote & { noteId: number } => typeof note.noteId === 'number');

  if (serverNotes.length === 0) {
    return;
  }

  await fieldNoteDBService.upsertFromServer(
    serverNotes.map((note) =>
      mapApiToRow({
        noteId: note.noteId,
        trainerId: note.ownerId ?? null,
        trainerName: note.ownerName ?? null,
        dogId: note.dogId ?? null,
        dogName: note.dogName ?? null,
        dogCode: note.dogCode ?? null,
        title: note.title,
        content: note.content,
        photoUrls: stringifyPhotoUrls(note.media?.map((item) => item.url) ?? []),
        recordingDate: note.recordedAt ?? null,
        location: note.location ?? null,
        linkedContentId: null,
        createdAt: note.recordedAt ?? null,
        updatedAt: note.recordedAt ?? null,
      }),
    ),
  );
};

const filterAccessibleNotes = async (notes: FieldNote[]): Promise<FieldNote[]> => {
  const accessibleChecks = await Promise.all(
    notes.map((note) =>
      trainerDogScopeService.canAccessDogScopedOwnedItem(
        { dogId: note.dogId ?? null, ownerId: note.ownerId ?? null },
        true,
      ),
    ),
  );

  return notes.filter((_, index) => accessibleChecks[index]);
};

const fetchNotePage = async (
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<FieldNote[]> => {
  const response = (await api.get(path, {
    params: {
      page: 0,
      size: FIELD_NOTE_PAGE_SIZE,
      ...params,
    },
  })) as ApiResponse<PageResponse<FieldNoteApiDto>>;

  return (unwrapApiData(response).content ?? []).map(mapApiToFieldNote);
};

export const fieldNoteService = {
  getAll: (): Promise<FieldNote[]> =>
    offlineFirstRead<FieldNote[]>({
      localFetch: async () => {
        const rows = await fieldNoteDBService.getAll();
        return filterAccessibleNotes(await Promise.all(rows.map(mapRowToFieldNote)));
      },
      remoteFetch: async () => filterAccessibleNotes(await fetchNotePage('/field-notes')),
      saveToLocal: async (notes) => {
        await saveRemoteNotesToLocal(notes);
      },
      entityName: 'field-notes',
    }),

  getMine: async (): Promise<FieldNote[]> =>
    offlineFirstRead<FieldNote[]>({
      localFetch: async () => {
        const currentUserId = useAuthStore.getState().user?.userId ?? 0;
        const rows = await fieldNoteDBService.getByTrainer(currentUserId);
        return filterAccessibleNotes(await Promise.all(rows.map(mapRowToFieldNote)));
      },
      remoteFetch: async () => filterAccessibleNotes(await fetchNotePage('/field-notes/my')),
      saveToLocal: async (notes) => {
        await saveRemoteNotesToLocal(notes);
      },
      entityName: 'field-notes:mine',
    }),

  getByDog: (dogId: number): Promise<FieldNote[]> =>
    offlineFirstRead<FieldNote[]>({
      localFetch: async () => {
        await trainerDogScopeService.assertAccessToDog(dogId, true, 'Ban khong duoc xem ghi chu cua cho nay');
        const rows = await fieldNoteDBService.getByDog(dogId);
        return Promise.all(rows.map(mapRowToFieldNote));
      },
      remoteFetch: async () => {
        await trainerDogScopeService.assertAccessToDog(dogId, true, 'Ban khong duoc xem ghi chu cua cho nay');
        return fetchNotePage(`/field-notes/by-dog/${dogId}`);
      },
      saveToLocal: async (notes) => {
        await saveRemoteNotesToLocal(notes);
      },
      entityName: `field-notes:dog:${dogId}`,
    }),

  getById: async (noteId: string | number): Promise<FieldNote> => {
    const localRow = await resolveLocalRow(noteId);
    if (localRow) {
      const localNote = await mapRowToFieldNote(localRow);
      await trainerDogScopeService.assertAccessToDogScopedOwnedItem(
        { dogId: localNote.dogId ?? null, ownerId: localNote.ownerId ?? null },
        true,
        'Ban khong duoc xem ghi chu nay',
      );
      return localNote;
    }

    const serverId = parseServerId(noteId);
    if (serverId == null || !isOnline()) {
      throw new Error('Khong tim thay ghi chu trong bo nho cuc bo');
    }

    const response = (await api.get(`/field-notes/${serverId}`)) as ApiResponse<FieldNoteApiDto>;
    const remoteNote = mapApiToFieldNote(unwrapApiData(response));
    await trainerDogScopeService.assertAccessToDogScopedOwnedItem(
      { dogId: remoteNote.dogId ?? null, ownerId: remoteNote.ownerId ?? null },
      true,
      'Ban khong duoc xem ghi chu nay',
    );
    await saveRemoteNotesToLocal([remoteNote]);

    const refreshedLocalRow = await fieldNoteDBService.getByServerId(serverId);
    return refreshedLocalRow ? mapRowToFieldNote(refreshedLocalRow) : remoteNote;
  },

  create: async (request: FieldNoteRequest): Promise<FieldNote> => {
    if (request.dogId) {
      await trainerDogScopeService.assertAccessToDog(request.dogId, true, 'Ban khong duoc tao ghi chu cho cho nay');
    }

    const user = useAuthStore.getState().user;
    const localId = await fieldNoteDBService.create({
      trainer_id: user?.userId ?? 0,
      dog_id: request.dogId ?? null,
      title: request.title.trim(),
      content: request.content.trim(),
      photo_urls: stringifyPhotoUrls(request.mediaUrls),
      recording_date: normalizeRecordedAt(request.recordedAt),
      location: request.location?.trim() || null,
      linked_content_id: null,
    });

    if (isOnline()) {
      await syncEngine.quickPush();
    }

    const row = await fieldNoteDBService.getById(localId);
    if (!row) {
      throw new Error('Khong the luu ghi chu thuc dia');
    }

    return mapRowToFieldNote(row);
  },

  update: async (noteId: string | number, request: FieldNoteRequest): Promise<FieldNote> => {
    const existing = await resolveLocalRow(noteId);
    if (!existing) {
      throw new Error('Khong tim thay ghi chu de cap nhat');
    }

    await trainerDogScopeService.assertAccessToDogScopedOwnedItem(
      { dogId: existing.dog_id ?? null, ownerId: existing.trainer_id },
      true,
      'Ban khong duoc cap nhat ghi chu nay',
    );

    if (request.dogId) {
      await trainerDogScopeService.assertAccessToDog(request.dogId, true, 'Ban khong duoc cap nhat ghi chu cho cho nay');
    }

    await fieldNoteDBService.update(existing.local_id, {
      dog_id: request.dogId ?? null,
      title: request.title.trim(),
      content: request.content.trim(),
      photo_urls: stringifyPhotoUrls(request.mediaUrls),
      recording_date: normalizeRecordedAt(request.recordedAt),
      location: request.location?.trim() || null,
      linked_content_id: null,
    });

    if (isOnline()) {
      await syncEngine.quickPush();
    }

    const refreshed = await fieldNoteDBService.getById(existing.local_id);
    if (!refreshed) {
      throw new Error('Khong the cap nhat ghi chu thuc dia');
    }

    return mapRowToFieldNote(refreshed);
  },

  delete: async (noteId: string | number): Promise<void> => {
    const existing = await resolveLocalRow(noteId);

    if (!existing) {
      const serverId = parseServerId(noteId);
      if (serverId == null) {
        throw new Error('Khong tim thay ghi chu de xoa');
      }

      const response = (await api.get(`/field-notes/${serverId}`)) as ApiResponse<FieldNoteApiDto>;
      const remoteNote = mapApiToFieldNote(unwrapApiData(response));
      await trainerDogScopeService.assertAccessToDogScopedOwnedItem(
        { dogId: remoteNote.dogId ?? null, ownerId: remoteNote.ownerId ?? null },
        true,
        'Ban khong duoc xoa ghi chu nay',
      );
      await api.delete(`/field-notes/${serverId}`);
      return;
    }

    await trainerDogScopeService.assertAccessToDogScopedOwnedItem(
      { dogId: existing.dog_id ?? null, ownerId: existing.trainer_id },
      true,
      'Ban khong duoc xoa ghi chu nay',
    );

    await fieldNoteDBService.softDelete(existing.local_id);

    if (isOnline()) {
      await syncEngine.quickPush();
    }
  },
};
