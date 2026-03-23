import api, { type ApiResponse, unwrapApiData } from './api';
import { offlineCacheDBService } from '../database/services/offlineCacheDBService';
import { dogAssignmentDBService } from '../database/services/dogAssignmentDBService';
import { dogProfileDBService } from '../database/services/dogProfileDBService';
import { fieldNoteDBService } from '../database/services/fieldNoteDBService';
import { operationReportDBService } from '../database/services/operationReportDBService';
import { useAuthStore } from '../stores/authStore';
import type { TrainerDashboardDog, TrainerDashboardStats } from '../types/dashboard';

const CACHE_KEY = 'trainer_dashboard_stats_v1';

interface TrainerDashboardStatsApi {
  assignedDogs?: {
    dogId: number;
    dogCode?: string | null;
    dogName?: string | null;
    breedId?: number | null;
    breedName?: string | null;
    imageUrl?: string | null;
    assignmentType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }[];
  totalFieldNotes?: number;
  totalReports?: number;
}

type TrainerDashboardDogApi = NonNullable<TrainerDashboardStatsApi['assignedDogs']>[number];

const normalizeDog = (item: TrainerDashboardDogApi): TrainerDashboardDog => ({
  dogId: item.dogId,
  dogCode: item.dogCode ?? null,
  dogName: item.dogName ?? null,
  breedId: item.breedId ?? null,
  breedName: item.breedName ?? null,
  imageUrl: item.imageUrl ?? null,
  assignmentType: item.assignmentType ?? null,
  startDate: item.startDate ?? null,
  endDate: item.endDate ?? null,
});

const normalizePayload = (
  payload: TrainerDashboardStatsApi,
  source: TrainerDashboardStats['source'],
  updatedAt: string | null,
): TrainerDashboardStats => ({
  assignedDogs: (payload.assignedDogs ?? []).map(normalizeDog),
  totalFieldNotes: payload.totalFieldNotes ?? 0,
  totalReports: payload.totalReports ?? 0,
  source,
  updatedAt,
});

const getCachedDashboard = async (): Promise<TrainerDashboardStats | null> => {
  const cached = await offlineCacheDBService.get(CACHE_KEY);
  if (!cached) {
    return null;
  }

  try {
    const parsed = JSON.parse(cached) as TrainerDashboardStatsApi & { updatedAt?: string | null };
    return normalizePayload(parsed, 'CACHE', parsed.updatedAt ?? null);
  } catch {
    return null;
  }
};

const saveCachedDashboard = async (payload: TrainerDashboardStatsApi): Promise<void> => {
  await offlineCacheDBService.set(
    CACHE_KEY,
    JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString(),
    }),
  );
};

const getLocalFallback = async (): Promise<TrainerDashboardStats> => {
  const trainerId = useAuthStore.getState().user?.userId ?? 0;

  const [assignments, fieldNotes, reports] = await Promise.all([
    dogAssignmentDBService.getActiveByTrainer(trainerId),
    fieldNoteDBService.getByTrainer(trainerId),
    operationReportDBService.getByTrainer(trainerId),
  ]);

  const assignedDogs = await Promise.all(
    assignments.map(async (assignment) => {
      const dog = await dogProfileDBService.getById(assignment.dog_id);
      return {
        dogId: assignment.dog_id,
        dogCode: assignment.dog_code ?? dog?.dog_code ?? null,
        dogName: assignment.dog_name ?? dog?.dog_name ?? null,
        breedId: dog?.breed_id ?? null,
        breedName: null,
        imageUrl: dog?.image_url ?? null,
        assignmentType: assignment.assignment_type ?? null,
        startDate: assignment.start_date ?? null,
        endDate: assignment.end_date ?? null,
      } satisfies TrainerDashboardDog;
    }),
  );

  return {
    assignedDogs,
    totalFieldNotes: fieldNotes.length,
    totalReports: reports.length,
    source: 'LOCAL',
    updatedAt: null,
  };
};

export const dashboardService = {
  getTrainerStats: async (): Promise<TrainerDashboardStats> => {
    try {
      const response = (await api.get('/dashboard/trainer-stats')) as ApiResponse<TrainerDashboardStatsApi>;
      const data = unwrapApiData(response);
      await saveCachedDashboard(data);
      return normalizePayload(data, 'REMOTE', new Date().toISOString());
    } catch {
      const cached = await getCachedDashboard();
      if (cached) {
        return cached;
      }

      return getLocalFallback();
    }
  },
};
