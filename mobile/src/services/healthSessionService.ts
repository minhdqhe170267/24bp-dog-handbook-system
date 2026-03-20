import api, { ApiResponse, PageResponse, unwrapApiData } from './api';
import { dogProfileDBService, healthSessionDBService, sessionFollowUpDBService } from '../database/services';
import { isOnline, offlineFirstRead } from './offlineFirst';
import { useAuthStore } from '../stores/authStore';
import { syncEngine } from '../sync/syncEngine';
import type { FollowUpStatus, HealthSessionRow, SessionFollowUpRow } from '../database/types';
import type {
  HealthSession,
  HealthSessionFollowUpRequest,
  HealthSessionRequest,
  HealthSessionResolveRequest,
  HealthSessionTimelineItem,
} from '../types/dogManagement';

interface HealthSessionFollowUpApiDto {
  followupId: number;
  followupDate?: string | null;
  statusUpdate?: string | null;
  notes?: string | null;
  weightKg?: number | null;
  temperatureC?: number | null;
  nextAction?: string | null;
}

interface HealthSessionApiDto {
  sessionId: number;
  dogId: number;
  dogName?: string | null;
  dogCode?: string | null;
  trainerId?: number | null;
  trainerName?: string | null;
  issueSummary?: string | null;
  initialDiagnosisId?: number | null;
  status?: string | null;
  severity?: string | null;
  startedAt?: string | null;
  lastUpdateAt?: string | null;
  followUpDate?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  followUps?: HealthSessionFollowUpApiDto[] | null;
}

const HEALTH_SESSION_PAGE_SIZE = 100;

const parseServerId = (value: string | number): number | null => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const buildTimelineTitle = (status?: string | null): string => {
  switch ((status || '').toUpperCase()) {
    case 'IMPROVED':
      return 'Cập nhật cải thiện';
    case 'WORSE':
      return 'Cập nhật xấu hơn';
    case 'RESOLVED':
      return 'Đã xử lý xong';
    default:
      return 'Cập nhật follow-up';
  }
};

const mapFollowUpRowToTimelineItem = (row: SessionFollowUpRow): HealthSessionTimelineItem => ({
  followUpId: row.server_id ?? row.local_id,
  sessionId: row.session_local_id,
  statusUpdate: row.status_update,
  title: buildTimelineTitle(row.status_update),
  notes: row.notes,
  nextAction: row.next_action,
  weightKg: row.weight_kg,
  temperatureC: row.temperature_c,
  createdAt: row.followup_date || row.created_at,
});

const mapApiFollowUpToTimelineItem = (
  sessionId: number,
  followUp: HealthSessionFollowUpApiDto,
): HealthSessionTimelineItem => ({
  followUpId: followUp.followupId,
  sessionId,
  statusUpdate: followUp.statusUpdate ?? null,
  title: buildTimelineTitle(followUp.statusUpdate),
  notes: followUp.notes ?? null,
  nextAction: followUp.nextAction ?? null,
  weightKg: followUp.weightKg ?? null,
  temperatureC: followUp.temperatureC ?? null,
  createdAt: followUp.followupDate ?? null,
});

const mapApiToHealthSession = (session: HealthSessionApiDto): HealthSession => ({
  sessionId: session.sessionId,
  dogId: session.dogId,
  dogName: session.dogName ?? null,
  dogCode: session.dogCode ?? null,
  trainerId: session.trainerId ?? null,
  handlerName: session.trainerName ?? null,
  issueSummary: session.issueSummary ?? null,
  status: session.status ?? null,
  severity: session.severity ?? null,
  startedAt: session.startedAt ?? null,
  lastUpdatedAt: session.lastUpdateAt ?? null,
  followUpDate: session.followUpDate ?? null,
  followUpCount: session.followUps?.length ?? 0,
  isLiveSync: true,
  resolutionNotes: session.resolutionNotes ?? null,
  resolvedAt: session.resolvedAt ?? null,
  syncStatus: 'SYNCED',
  timeline: (session.followUps ?? []).map((item) => mapApiFollowUpToTimelineItem(session.sessionId, item)),
});

const mapRowToHealthSession = async (row: HealthSessionRow): Promise<HealthSession> => {
  const currentUser = useAuthStore.getState().user;
  const dog = await dogProfileDBService.getById(row.dog_id);
  const followUpRows = await sessionFollowUpDBService.getBySession(row.local_id);

  return {
    sessionId: row.server_id ?? row.local_id,
    dogId: row.dog_id,
    dogName: dog?.dog_name ?? null,
    dogCode: dog?.dog_code ?? null,
    dogBreedName: null,
    trainerId: row.trainer_id,
    handlerName: currentUser?.userId === row.trainer_id ? currentUser.fullName : null,
    unitName: currentUser?.userId === row.trainer_id ? currentUser.unit ?? null : null,
    issueSummary: row.issue_summary,
    status: row.status,
    severity: row.severity,
    startedAt: row.started_at,
    lastUpdatedAt: row.last_update_at,
    followUpDate: row.follow_up_date,
    followUpCount: followUpRows.length,
    isLiveSync: row.sync_status === 'SYNCED',
    resolutionNotes: row.resolution_notes,
    resolvedAt: row.resolved_at,
    syncStatus: row.sync_status,
    timeline: followUpRows.map(mapFollowUpRowToTimelineItem),
  };
};

const resolveLocalRow = async (sessionId: string | number): Promise<HealthSessionRow | null> => {
  if (typeof sessionId === 'string') {
    const localRow = await healthSessionDBService.getById(sessionId);
    if (localRow) {
      return localRow;
    }
  }

  const serverId = parseServerId(sessionId);
  if (serverId == null) {
    return null;
  }

  return healthSessionDBService.getByServerId(serverId);
};

const mapSessionToRow = (session: HealthSession): Omit<HealthSessionRow, 'local_id' | 'sync_status'> & { server_id: number } => ({
  server_id: Number(session.sessionId),
  dog_id: session.dogId,
  trainer_id: session.trainerId ?? 0,
  issue_summary: session.issueSummary ?? '',
  initial_diagnosis_id: null,
  status: (session.status ?? 'ACTIVE') as HealthSessionRow['status'],
  severity: (session.severity ?? 'MEDIUM') as HealthSessionRow['severity'],
  started_at: session.startedAt ?? new Date().toISOString(),
  last_update_at: session.lastUpdatedAt ?? session.startedAt ?? new Date().toISOString(),
  follow_up_date: session.followUpDate ?? null,
  resolution_notes: session.resolutionNotes ?? null,
  resolved_at: session.resolvedAt ?? null,
  created_at: session.startedAt ?? new Date().toISOString(),
  updated_at: session.lastUpdatedAt ?? session.startedAt ?? new Date().toISOString(),
});

const mapTimelineToRow = (
  sessionLocalId: string,
  item: HealthSessionTimelineItem,
): Omit<SessionFollowUpRow, 'local_id' | 'sync_status'> & { server_id: number } => ({
  server_id: Number(item.followUpId),
  session_local_id: sessionLocalId,
  followup_date: item.createdAt ?? new Date().toISOString(),
  status_update: (item.statusUpdate ?? 'SAME') as FollowUpStatus,
  notes: item.notes ?? null,
  weight_kg: item.weightKg ?? null,
  temperature_c: item.temperatureC ?? null,
  next_action: item.nextAction ?? null,
  created_at: item.createdAt ?? new Date().toISOString(),
  updated_at: item.createdAt ?? new Date().toISOString(),
});

const saveRemoteSessionsToLocal = async (sessions: HealthSession[]): Promise<void> => {
  const validSessions = sessions.filter(
    (session): session is HealthSession & { sessionId: number } => typeof session.sessionId === 'number',
  );

  if (validSessions.length === 0) {
    return;
  }

  await healthSessionDBService.upsertFromServer(validSessions.map(mapSessionToRow));

  for (const session of validSessions) {
    const localRow = await healthSessionDBService.getByServerId(session.sessionId);
    if (!localRow || !session.timeline?.length) {
      continue;
    }

    const followUps = session.timeline.filter(
      (item): item is HealthSessionTimelineItem & { followUpId: number } => typeof item.followUpId === 'number',
    );

    if (followUps.length === 0) {
      continue;
    }

    await sessionFollowUpDBService.upsertFromServer(
      followUps.map((item) => mapTimelineToRow(localRow.local_id, item)),
    );
  }
};

const fetchSessionPage = async (
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<HealthSession[]> => {
  const response = (await api.get(path, {
    params: {
      page: 0,
      size: HEALTH_SESSION_PAGE_SIZE,
      ...params,
    },
  })) as ApiResponse<PageResponse<HealthSessionApiDto>>;

  return (unwrapApiData(response).content ?? []).map(mapApiToHealthSession);
};

export const healthSessionService = {
  getMine: (): Promise<HealthSession[]> =>
    offlineFirstRead<HealthSession[]>({
      localFetch: async () => {
        const currentUserId = useAuthStore.getState().user?.userId ?? 0;
        const rows = await healthSessionDBService.getAll();
        const ownRows = currentUserId > 0 ? rows.filter((row) => row.trainer_id === currentUserId) : rows;
        return Promise.all(ownRows.map(mapRowToHealthSession));
      },
      remoteFetch: async () => fetchSessionPage('/health-sessions/my'),
      saveToLocal: async (sessions) => {
        await saveRemoteSessionsToLocal(sessions);
      },
      entityName: 'health-sessions:mine',
    }),

  getByDog: (dogId: number): Promise<HealthSession[]> =>
    offlineFirstRead<HealthSession[]>({
      localFetch: async () => {
        const rows = await healthSessionDBService.getByDog(dogId);
        return Promise.all(rows.map(mapRowToHealthSession));
      },
      remoteFetch: async () => fetchSessionPage(`/health-sessions/by-dog/${dogId}`),
      saveToLocal: async (sessions) => {
        await saveRemoteSessionsToLocal(sessions);
      },
      entityName: `health-sessions:dog:${dogId}`,
    }),

  getById: async (sessionId: string | number): Promise<HealthSession> => {
    const localRow = await resolveLocalRow(sessionId);
    if (localRow) {
      return mapRowToHealthSession(localRow);
    }

    const serverId = parseServerId(sessionId);
    if (serverId == null || !isOnline()) {
      throw new Error('KhÃ´ng tÃ¬m tháº¥y phiÃªn theo dÃµi trong bá»™ nhá»› cá»¥c bá»™');
    }

    const response = (await api.get(`/health-sessions/${serverId}`)) as ApiResponse<HealthSessionApiDto>;
    const remoteSession = mapApiToHealthSession(unwrapApiData(response));
    await saveRemoteSessionsToLocal([remoteSession]);

    const refreshedLocalRow = await healthSessionDBService.getByServerId(serverId);
    return refreshedLocalRow ? mapRowToHealthSession(refreshedLocalRow) : remoteSession;
  },

  create: async (request: HealthSessionRequest): Promise<HealthSession> => {
    const user = useAuthStore.getState().user;
    const now = new Date().toISOString();
    const localId = await healthSessionDBService.create({
      dog_id: request.dogId,
      trainer_id: user?.userId ?? 0,
      issue_summary: request.issueSummary.trim(),
      initial_diagnosis_id: null,
      status: 'ACTIVE',
      severity: (request.severity ?? 'MEDIUM') as HealthSessionRow['severity'],
      started_at: now,
      last_update_at: now,
      follow_up_date: request.followUpDate ?? null,
      resolution_notes: null,
      resolved_at: null,
    });

    if (isOnline()) {
      await syncEngine.quickPush();
    }

    const row = await healthSessionDBService.getById(localId);
    if (!row) {
      throw new Error('KhÃ´ng thá»ƒ táº¡o phiÃªn theo dÃµi');
    }

    return mapRowToHealthSession(row);
  },

  followUp: async (sessionId: string | number, request: HealthSessionFollowUpRequest): Promise<HealthSession> => {
    const existing = await resolveLocalRow(sessionId);
    if (!existing) {
      throw new Error('KhÃ´ng tÃ¬m tháº¥y phiÃªn theo dÃµi');
    }

    const now = new Date().toISOString();

    await sessionFollowUpDBService.create({
      session_local_id: existing.local_id,
      followup_date: now,
      status_update: request.statusUpdate as FollowUpStatus,
      notes: request.notes ?? null,
      weight_kg: request.weightKg ?? null,
      temperature_c: request.temperatureC ?? null,
      next_action: request.nextAction ?? null,
    });

    const sessionPatch: Partial<HealthSessionRow> = {
      last_update_at: now,
    };

    if ((request.statusUpdate || '').toUpperCase() === 'RESOLVED') {
      sessionPatch.status = 'RESOLVED';
      sessionPatch.resolved_at = now;
    }

    if ((request.statusUpdate || '').toUpperCase() === 'WORSE') {
      sessionPatch.severity = 'HIGH';
    }

    await healthSessionDBService.update(existing.local_id, sessionPatch);

    if (isOnline()) {
      await syncEngine.quickPush();
    }

    return healthSessionService.getById(existing.local_id);
  },

  resolve: async (sessionId: string | number, request: HealthSessionResolveRequest): Promise<HealthSession> => {
    const existing = await resolveLocalRow(sessionId);
    if (!existing) {
      throw new Error('KhÃ´ng tÃ¬m tháº¥y phiÃªn theo dÃµi');
    }

    const now = new Date().toISOString();
    await healthSessionDBService.update(existing.local_id, {
      status: 'RESOLVED',
      resolution_notes: request.resolutionNotes ?? null,
      resolved_at: now,
      last_update_at: now,
    });

    if (isOnline()) {
      await syncEngine.quickPush();
    }

    return healthSessionService.getById(existing.local_id);
  },
};
