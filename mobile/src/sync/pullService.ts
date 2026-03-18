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
import { db } from '../database';
import type { PullResult, ProgressCallback } from './types';

/**
 * Convert camelCase key to snake_case.
 * Backend sends camelCase (breedId, dogName) but SQLite uses snake_case (breed_id, dog_name).
 */
const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/**
 * Metadata fields the backend injects for sync tracking.
 * These don't exist as columns in most SQLite tables — strip before upsert.
 */
const SYNC_METADATA_FIELDS = new Set(['syncAction', 'sync_action']);

/**
 * Convert all keys of a record from camelCase to snake_case,
 * stripping sync-only metadata fields that don't exist in SQLite.
 */
const toSnakeCaseRecord = (record: Record<string, any>, injectAuditFields: boolean): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of Object.keys(record)) {
    if (SYNC_METADATA_FIELDS.has(key)) continue;
    result[camelToSnake(key)] = record[key];
  }
  // Inject NOT NULL audit fields only for tables that have them
  if (injectAuditFields) {
    const now = new Date().toISOString();
    if (!result.created_at) result.created_at = result.updated_at || now;
    if (!result.updated_at) result.updated_at = now;
  }
  return result;
};

/** Junction tables have no audit fields (created_at, updated_at) */
const JUNCTION_TABLES = new Set(['disease_symptom_mapping', 'roadmap_exercise']);

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
  medications:            { table: 'medication',               dbService: medicationDBService },
  firstAidGuides:         { table: 'first_aid_guide',          dbService: firstAidDBService },
  trainingMethods:        { table: 'training_method',          dbService: trainingMethodDBService },
  exercises:              { table: 'training_exercise',        dbService: exerciseDBService },
  roadmaps:               { table: 'training_roadmap',         dbService: roadmapDBService },
  nutritionStandards:     { table: 'nutrition_standard',       dbService: nutritionDBService },
  developmentStages:      { table: 'development_stage',        dbService: developmentStageDBService },
  contents:               { table: 'content',                  dbService: contentDBService },
  dogProfiles:            { table: 'dog_profile',              dbService: dogProfileDBService },
  dogAssignments:         { table: 'dog_assignment',           dbService: dogAssignmentDBService },
  // Junction tables LAST — they have FK references to parent tables above
  diseaseSymptomMappings: { table: 'disease_symptom_mapping',  dbService: diseaseSymptomMappingDBService },
  roadmapExercises:       { table: 'roadmap_exercise',         dbService: roadmapExerciseDBService },
};

/**
 * Ordered keys — parent tables first, junction tables last.
 * This ensures FK constraints are satisfied during upsert.
 */
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
      const rawRecords = entityData[key] || [];

      // Convert camelCase keys from server to snake_case for SQLite
      const needsAudit = !JUNCTION_TABLES.has(table);
      const records = rawRecords.map((r: Record<string, any>) => toSnakeCaseRecord(r, needsAudit));

      if (records.length > 0) {
        // Temporarily disable FK checks for junction tables — parent rows
        // may not exist in SQLite yet during incremental sync
        const isJunction = JUNCTION_TABLES.has(table);
        if (isJunction) db.execSync('PRAGMA foreign_keys = OFF;');
        try {
          await dbService.upsertFromServer(records);
        } finally {
          if (isJunction) db.execSync('PRAGMA foreign_keys = ON;');
        }
      }

      const recordCount = await dbService.getCount();
      await syncMetadataDBService.updateAfterSync(table, recordCount, 'SUCCESS');

      results[table] = rawRecords.length;
      console.log(`[SYNC:PULL] ${table}: ${rawRecords.length} records`);
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
