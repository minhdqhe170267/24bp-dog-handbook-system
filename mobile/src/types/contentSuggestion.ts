import type { SuggestionStatus, SuggestionType, SyncStatus } from '../database/types';

export interface ContentSuggestionItem {
  routeId: string;
  localId: string | null;
  serverId: number | null;
  trainerId: number;
  trainerName: string | null;
  suggestionType: SuggestionType;
  relatedExerciseId: number | null;
  relatedExerciseName: string | null;
  title: string;
  description: string;
  status: SuggestionStatus;
  adminResponse: string | null;
  reviewedById: number | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  syncStatus: SyncStatus;
  source: 'REMOTE' | 'LOCAL';
}

export interface CreateContentSuggestionInput {
  suggestionType: SuggestionType;
  relatedExerciseId: number | null;
  title: string;
  description: string;
}

export interface ContentSuggestionStatusSummary {
  total: number;
  unreadFeedback: number;
  pendingSync: number;
  implemented: number;
}
