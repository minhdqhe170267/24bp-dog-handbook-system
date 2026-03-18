// ──────────────────────────────────────────────────────────────
// PULL: Download content updates from server to SQLite
// Single request GET /api/v1/sync/pull?since=<ISO timestamp>
// Server returns all entity types in one response.
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
 * Map: backend response key (camelCase) → SQLite table + DB service.
 * Keys MUST match backend SyncServiceImpl data.put() keys exactly.
 */
interface PullTableConfig {
  table: string;
  dbService: {
    upsertFromServer: (records: any[]) => Promise<void>;
    getCount: () => Promise<number>;
  };
}

const PULL_KEY_TO_TABLE: Record<string, PullTableConfig> = {
  breeds:                 { table: 'dog_breed',                dbService: breedDBService },
  diseases:               { table: 'disease',                  dbService: diseaseDBService },
  symptoms:               { table: 'symptom',                  dbService: symptomDBService },
  diseaseSymptomMappings: { table: 'disease_symptom_mapping',  dbService: diseaseSymptomMappingDBService },
  medications:            { table: 'medication',               dbService: medicationDBService },
  firstAidGuides:         { table: 'first_aid_guide',          dbService: firstAidDBService },
  trainingMethods:        { table: 'training_method',          dbService: trainingMethodDBService },
  exercises:              { table: 'training_exercise',        dbService: exerciseDBService },
  roadmaps:               { table: 'training_roadmap',         dbService: roadmapDBService },
  roadmapExercises:       { table: 'roadmap_exercise',         dbService: roadmapExerciseDBService },
  nutritionStandards:     { table: 'nutrition_standard',       dbService: nutritionDBService },
  developmentStages:      { table: 'development_stage',        dbService: developmentStageDBService },
  contents:               { table: 'content',                  dbService: contentDBService },
  dogProfiles:            { table: 'dog_profile',              dbService: dogProfileDBService },
  dogAssignments:         { table: 'dog_assignment',           dbService: dogAssignmentDBService },
};

const PULL_KEYS = Object.keys(PULL_KEY_TO_TABLE);

/**
 * Pull updates from server via single GET /sync/pull?since=<oldest>.
 * Parses each key from the response and upserts into SQLite.
 */
export const pullServerUpdates = async (onProgress?: ProgressCallback): Promise<PullResult> => {
  const results: { [table: string]: number } = {};

  // 1. Determine "since" — oldest successful sync across all tables
  const allMetadata = await syncMetadataDBService.getAll();
  const syncTimestamps = allMetadata
    .filter(m => m.sync_status !== 'NEVER' && m.last_sync_at)
    .map(m => m.last_sync_at!);
  const oldestSync = syncTimestamps.length > 0
    ? syncTimestamps.sort()[0]
    : undefined;

  // 2. Single request to server
  const params: Record<string, string> = {};
  if (oldestSync) params.since = oldestSync;

  const apiResponse = await apiClient.get('/sync/pull', { params }) as any;

  // apiClient interceptor returns ApiResponse envelope: { success, data, message }
  // data = SyncResponse { data: { breeds: [...], ... }, syncTimestamp }
  const syncResponse = apiResponse.data;
  const entityData: Record<string, any[]> = syncResponse?.data || {};
  const syncTimestamp = syncResponse?.syncTimestamp || new Date().toISOString();

  // 3. Process each known key → upsert into SQLite
  for (let i = 0; i < PULL_KEYS.length; i++) {
    const key = PULL_KEYS[i];
    const { table, dbService } = PULL_KEY_TO_TABLE[key];
    onProgress?.('pull', table, i + 1, PULL_KEYS.length);

    try {
      const records = entityData[key] || [];

      if (records.length > 0) {
        await dbService.upsertFromServer(records);
      }

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

  // Log any unknown keys from server (future entity types not yet handled)
  for (const serverKey of Object.keys(entityData)) {
    if (!(serverKey in PULL_KEY_TO_TABLE)) {
      console.warn(`[SYNC:PULL] Unknown key from server: "${serverKey}" — skipping`);
    }
  }

  return { tables: results };
};

/**
 * Check if initial sync is needed (all tables still NEVER synced).
 */
export const isInitialSyncNeeded = async (): Promise<boolean> => {
  const neverSynced = await syncMetadataDBService.getNeverSynced();
  return neverSynced.length >= PULL_KEYS.length * 0.8;
};

/** Exposed for syncEngine.initialSync to reset metadata */
export const PULL_TABLE_COUNT = PULL_KEYS.length;
