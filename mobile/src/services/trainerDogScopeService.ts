import { fallbackAssignments, fallbackDogs } from '../features/dog-management/ui';
import { useAuthStore } from '../stores/authStore';
import type { DogAssignment, DogProfile } from '../types/dogManagement';
import { assignmentService } from './assignmentService';
import { dogService } from './dogService';

const CACHE_TTL_MS = 15_000;
export const TRAINER_DOG_SCOPE_DENIED = 'TRAINER_DOG_SCOPE_DENIED';

export interface TrainerDogScope {
  trainerId: number | null;
  assignments: DogAssignment[];
  assignmentMap: Map<number, DogAssignment>;
  assignedDogIds: number[];
  dogs: DogProfile[];
}

interface DogScopedItem {
  dogId?: number | null;
}

interface DogScopedOwnedItem extends DogScopedItem {
  ownerId?: number | null;
}

type ScopeCacheEntry = {
  trainerId: number;
  expiresAt: number;
  value: TrainerDogScope;
};

let scopeCache: ScopeCacheEntry | null = null;

const getStartOfToday = (): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

const isActiveAssignment = (assignment: DogAssignment): boolean => {
  if (assignment.isActive === false) {
    return false;
  }

  if (!assignment.endDate) {
    return true;
  }

  const endDate = new Date(assignment.endDate).getTime();
  return !Number.isFinite(endDate) || endDate >= getStartOfToday();
};

const toAssignmentMap = (assignments: DogAssignment[]): Map<number, DogAssignment> => {
  const map = new Map<number, DogAssignment>();

  assignments.forEach((assignment) => {
    if (!map.has(assignment.dogId)) {
      map.set(assignment.dogId, assignment);
    }
  });

  return map;
};

const filterFallbackAssignments = (trainerId: number): DogAssignment[] =>
  fallbackAssignments.filter(
    (assignment) => assignment.trainerId === trainerId && isActiveAssignment(assignment),
  );

const resolveDogs = async (dogIds: number[]): Promise<DogProfile[]> => {
  if (!dogIds.length) {
    return [];
  }

  const fallbackMap = new Map(fallbackDogs.map((dog) => [dog.dogId, dog]));
  const results = await Promise.allSettled(dogIds.map((dogId) => dogService.getById(dogId)));

  return dogIds
    .map((dogId, index) => {
      const result = results[index];
      if (result?.status === 'fulfilled') {
        return result.value;
      }
      return fallbackMap.get(dogId) ?? null;
    })
    .filter((dog): dog is DogProfile => dog != null);
};

const buildScope = async (trainerId: number): Promise<TrainerDogScope> => {
  let assignments: DogAssignment[] = [];

  try {
    assignments = (await assignmentService.getByTrainer(trainerId)).filter(isActiveAssignment);
  } catch {
    assignments = filterFallbackAssignments(trainerId);
  }

  const assignmentMap = toAssignmentMap(assignments);
  const assignedDogIds = [...assignmentMap.keys()];
  const dogs = await resolveDogs(assignedDogIds);

  return {
    trainerId,
    assignments,
    assignmentMap,
    assignedDogIds,
    dogs,
  };
};

export const trainerDogScopeService = {
  clearCache(): void {
    scopeCache = null;
  },

  async getScope(force = false): Promise<TrainerDogScope> {
    const trainerId = useAuthStore.getState().user?.userId ?? null;

    if (!trainerId) {
      return {
        trainerId: null,
        assignments: [],
        assignmentMap: new Map<number, DogAssignment>(),
        assignedDogIds: [],
        dogs: [],
      };
    }

    if (!force && scopeCache && scopeCache.trainerId === trainerId && scopeCache.expiresAt > Date.now()) {
      return scopeCache.value;
    }

    const scope = await buildScope(trainerId);
    scopeCache = {
      trainerId,
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: scope,
    };

    return scope;
  },

  async getAssignedDogIds(force = false): Promise<number[]> {
    const scope = await this.getScope(force);
    return scope.assignedDogIds;
  },

  async getAssignedDogs(force = false): Promise<DogProfile[]> {
    const scope = await this.getScope(force);
    return scope.dogs;
  },

  async hasAccessToDog(dogId?: number | null, force = false): Promise<boolean> {
    if (!dogId) {
      return false;
    }

    const scope = await this.getScope(force);
    return scope.assignmentMap.has(dogId);
  },

  async assertAccessToDog(dogId?: number | null, force = false, message?: string): Promise<void> {
    const hasAccess = await this.hasAccessToDog(dogId, force);
    if (!hasAccess) {
      throw this.createAccessError(message);
    }
  },

  async getAssignmentForDog(dogId?: number | null, force = false): Promise<DogAssignment | null> {
    if (!dogId) {
      return null;
    }

    const scope = await this.getScope(force);
    return scope.assignmentMap.get(dogId) ?? null;
  },

  async filterDogScopedItems<T extends DogScopedItem>(items: T[], force = false): Promise<T[]> {
    if (!items.length) {
      return [];
    }

    const scope = await this.getScope(force);
    return items.filter((item) => (item.dogId ? scope.assignmentMap.has(item.dogId) : false));
  },

  canAccessDoglessOwnedItem(ownerId?: number | null): boolean {
    const currentUserId = useAuthStore.getState().user?.userId ?? null;
    return Boolean(ownerId && currentUserId && ownerId === currentUserId);
  },

  async canAccessDogScopedOwnedItem<T extends DogScopedOwnedItem>(item: T, force = false): Promise<boolean> {
    if (item.dogId) {
      return this.hasAccessToDog(item.dogId, force);
    }

    return this.canAccessDoglessOwnedItem(item.ownerId);
  },

  async assertAccessToDogScopedOwnedItem<T extends DogScopedOwnedItem>(
    item: T,
    force = false,
    message?: string,
  ): Promise<void> {
    const hasAccess = await this.canAccessDogScopedOwnedItem(item, force);
    if (!hasAccess) {
      throw this.createAccessError(message);
    }
  },

  createAccessError(message = 'Ngoai pham vi cho duoc phan cong'): Error & { code: string } {
    const error = new Error(message) as Error & { code: string };
    error.code = TRAINER_DOG_SCOPE_DENIED;
    return error;
  },

  isAccessDeniedError(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === TRAINER_DOG_SCOPE_DENIED,
    );
  },
};
