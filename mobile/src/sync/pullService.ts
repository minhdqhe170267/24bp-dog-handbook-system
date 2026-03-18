// ──────────────────────────────────────────────────────────────
// PULL: Download content updates from server to SQLite
// For each content table, calls GET /api/{endpoint} and upserts
// into local SQLite. Uses sync_metadata.last_sync_at for delta.
// ──────────────────────────────────────────────────────────────

import apiClient from '../services/api';
import { syncMetadataDBService } from '../database/services/syncMetadataDBService';
import { breedDBService } from '../database/services/breedDBService';
import { developmentStageDBService } from '../database/services/developmentStageDBService';
import { diseaseDBService } from '../database/services/diseaseDBService';
import { symptomDBService } from '../database/services/symptomDBService';
import { diseaseSymptomMappingDBService } from '../database/services/diseaseSymptomMappingDBService';
import { medicationDBService } from '../database/services/medicationDBService';
import { firstAidDBService } from '../database/services/firstAidDBService';
import { trainingMethodDBService } from '../database/services/trainingMethodDBService';
import { exerciseDBService } from '../database/services/exerciseDBService';
import { roadmapDBService } from '../database/services/roadmapDBService';
import { roadmapExerciseDBService } from '../database/services/roadmapExerciseDBService';
import { nutritionDBService } from '../database/services/nutritionDBService';
import { contentDBService } from '../database/services/contentDBService';
import { dogProfileDBService } from '../database/services/dogProfileDBService';
import { dogAssignmentDBService } from '../database/services/dogAssignmentDBService';
import type { PullResult, ProgressCallback } from './types';

/**
 * Map: sync_metadata table_name → API endpoint + DB service
 *
 * Group A: Content tables (read-only, pulled from server)
 * Group B partial: dog_profile, dog_assignment (pulled from server but also editable)
 */
interface SyncTableConfig {
  table: string;
  endpoint: string;
  dbService: {
    upsertFromServer: (records: any[]) => Promise<void>;
    getCount: () => Promise<number>;
  };
}

const SYNC_TABLES: SyncTableConfig[] = [
  // Group A — Content tables
  { table: 'dog_breed', endpoint: '/breeds', dbService: breedDBService },
  { table: 'development_stage', endpoint: '/development-stages', dbService: developmentStageDBService },
  { table: 'disease', endpoint: '/diseases', dbService: diseaseDBService },
  { table: 'symptom', endpoint: '/symptoms', dbService: symptomDBService },
  { table: 'disease_symptom_mapping', endpoint: '/diseases/symptom-mappings', dbService: diseaseSymptomMappingDBService },
  { table: 'medication', endpoint: '/medications', dbService: medicationDBService },
  { table: 'first_aid_guide', endpoint: '/first-aid-guides', dbService: firstAidDBService },
  { table: 'training_method', endpoint: '/training-methods', dbService: trainingMethodDBService },
  { table: 'training_exercise', endpoint: '/exercises', dbService: exerciseDBService },
  { table: 'training_roadmap', endpoint: '/roadmaps', dbService: roadmapDBService },
  { table: 'roadmap_exercise', endpoint: '/roadmaps/exercises', dbService: roadmapExerciseDBService },
  { table: 'nutrition_standard', endpoint: '/nutrition-standards', dbService: nutritionDBService },
  { table: 'content', endpoint: '/contents', dbService: contentDBService },

  // Group B partial — Pulled from server (assigned dogs, assignments)
  { table: 'dog_profile', endpoint: '/dogs', dbService: dogProfileDBService },
  { table: 'dog_assignment', endpoint: '/dogs/assignments', dbService: dogAssignmentDBService },
];

/**
 * Pull updates from server for all content tables.
 * Uses last_sync_at from sync_metadata for delta sync.
 *
 * TODO: Backend endpoints need to support ?since= query param for delta sync.
 *       Until then, full data is fetched each time (acceptable for content tables).
 */
export const pullServerUpdates = async (onProgress?: ProgressCallback): Promise<PullResult> => {
  const results: { [table: string]: number } = {};

  for (let i = 0; i < SYNC_TABLES.length; i++) {
    const { table, endpoint, dbService } = SYNC_TABLES[i];
    onProgress?.('pull', table, i + 1, SYNC_TABLES.length);

    try {
      // 1. Get last sync timestamp for delta
      const metadata = await syncMetadataDBService.getByTable(table);
      const since = metadata?.last_sync_at || null;

      // 2. Fetch from server
      // TODO: Backend should support ?since=<ISO timestamp> for delta sync
      //       For now, we send it but backend may ignore it and return all data
      const params: Record<string, any> = {};
      if (since) params.since = since;

      const apiResponse = await apiClient.get(endpoint, { params }) as any;

      // Handle both paginated (PageResponse.content) and plain array responses
      let records: any[];
      if (apiResponse.data && Array.isArray(apiResponse.data.content)) {
        records = apiResponse.data.content;
      } else if (Array.isArray(apiResponse.data)) {
        records = apiResponse.data;
      } else if (apiResponse.data && typeof apiResponse.data === 'object') {
        // Single object response — wrap in array
        records = [apiResponse.data];
      } else {
        records = [];
      }

      // 3. Batch upsert into SQLite
      if (records.length > 0) {
        await dbService.upsertFromServer(records);
      }

      // 4. Update sync_metadata
      const recordCount = await dbService.getCount();
      await syncMetadataDBService.updateAfterSync(table, recordCount, 'SUCCESS');

      results[table] = records.length;
      console.log(`[SYNC:PULL] ${table}: ${records.length} records`);
    } catch (err: any) {
      console.error(`[SYNC:PULL] ${table}: failed —`, err?.message || err);
      await syncMetadataDBService.markFailed(table);
      results[table] = -1;
    }
  }

  return { tables: results };
};

/**
 * Check if initial sync is needed (all tables still NEVER synced).
 */
export const isInitialSyncNeeded = async (): Promise<boolean> => {
  const neverSynced = await syncMetadataDBService.getNeverSynced();
  // If most tables have never been synced, consider it an initial sync
  return neverSynced.length >= SYNC_TABLES.length * 0.8;
};

/** Exposed for syncEngine.initialSync to reset metadata */
export const PULL_TABLE_COUNT = SYNC_TABLES.length;
