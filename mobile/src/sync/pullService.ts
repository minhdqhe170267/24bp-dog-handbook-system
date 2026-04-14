import apiClient from '../services/api';
import { db } from '../database';
import { breedDBService } from '../database/services/breedDBService';
import { contentDBService } from '../database/services/contentDBService';
import { developmentStageDBService } from '../database/services/developmentStageDBService';
import { diseaseDBService } from '../database/services/diseaseDBService';
import { diseaseSymptomMappingDBService } from '../database/services/diseaseSymptomMappingDBService';
import { dogAssignmentDBService } from '../database/services/dogAssignmentDBService';
import { dogProfileDBService } from '../database/services/dogProfileDBService';
import { exerciseDBService } from '../database/services/exerciseDBService';
import { firstAidDBService } from '../database/services/firstAidDBService';
import { medicationDBService } from '../database/services/medicationDBService';
import { nutritionDBService } from '../database/services/nutritionDBService';
import { roadmapDBService } from '../database/services/roadmapDBService';
import { roadmapExerciseDBService } from '../database/services/roadmapExerciseDBService';
import { symptomDBService } from '../database/services/symptomDBService';
import { syncMetadataDBService } from '../database/services/syncMetadataDBService';
import { trainingMethodDBService } from '../database/services/trainingMethodDBService';
import type { PullResult, ProgressCallback } from './types';

const camelToSnake = (value: string): string =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const SYNC_METADATA_FIELDS = new Set(['syncAction', 'sync_action']);

const toSnakeCaseRecord = (
  record: Record<string, unknown>,
  injectAuditFields: boolean,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(record)) {
    if (SYNC_METADATA_FIELDS.has(key)) {
      continue;
    }

    result[camelToSnake(key)] = record[key];
  }

  if (injectAuditFields) {
    const now = new Date().toISOString();
    if (!result.created_at) {
      result.created_at = result.updated_at || now;
    }
    if (!result.updated_at) {
      result.updated_at = now;
    }
  }

  return result;
};

const JUNCTION_TABLES = new Set(['disease_symptom_mapping', 'roadmap_exercise']);

const TABLES_WITH_BREED_REFERENCE = new Set([
  'development_stage',
  'nutrition_standard',
  'training_roadmap',
  'dog_profile',
]);

interface PullTableConfig {
  table: string;
  dbService: {
    upsertFromServer: (records: any[]) => Promise<void>;
    getCount: () => Promise<number>;
  };
}

const PULL_KEY_TO_TABLE: Record<string, PullTableConfig> = {
  breeds: { table: 'dog_breed', dbService: breedDBService },
  diseases: { table: 'disease', dbService: diseaseDBService },
  symptoms: { table: 'symptom', dbService: symptomDBService },
  medications: { table: 'medication', dbService: medicationDBService },
  firstAidGuides: { table: 'first_aid_guide', dbService: firstAidDBService },
  trainingMethods: { table: 'training_method', dbService: trainingMethodDBService },
  exercises: { table: 'training_exercise', dbService: exerciseDBService },
  roadmapPhases: { table: 'training_roadmap', dbService: roadmapDBService },
  nutritionStandards: { table: 'nutrition_standard', dbService: nutritionDBService },
  developmentStages: { table: 'development_stage', dbService: developmentStageDBService },
  contents: { table: 'content', dbService: contentDBService },
  dogProfiles: { table: 'dog_profile', dbService: dogProfileDBService },
  dogAssignments: { table: 'dog_assignment', dbService: dogAssignmentDBService },
  diseaseSymptomMappings: {
    table: 'disease_symptom_mapping',
    dbService: diseaseSymptomMappingDBService,
  },
  roadmapExercises: { table: 'roadmap_exercise', dbService: roadmapExerciseDBService },
};

const PULL_KEYS = Object.keys(PULL_KEY_TO_TABLE);

const normalizeRecordForTable = (
  table: string,
  record: Record<string, unknown>,
): Record<string, unknown> => {
  if (table === 'dog_breed') {
    if (!record.breed_name) {
      const fallbackBreedId =
        typeof record.breed_id === 'number' || typeof record.breed_id === 'string'
          ? record.breed_id
          : 'N/A';
      record.breed_name = `Giống chó #${fallbackBreedId}`;
    }

    if (record.status === null || record.status === undefined) {
      record.status = 'DRAFT';
    }
  }

  if (table === 'first_aid_guide' && !record.immediate_steps) {
    record.immediate_steps = record.description || 'Chưa có hướng dẫn sơ cứu tức thì.';
  }

  // Handle DELETE records: server only sends IDs + is_deleted/status, fill NOT NULL defaults
  const isDeleteRecord = record.is_deleted === 1 || record.is_deleted === true;

  if (table === 'training_exercise') {
    if (!record.exercise_name) record.exercise_name = isDeleteRecord ? '(deleted)' : 'N/A';
    if (!record.difficulty_level) record.difficulty_level = 'MEDIUM';
    if (!record.status) record.status = 'DRAFT';
  }

  if (table === 'training_roadmap') {
    // Backend sends phaseId as the actual roadmap_id PK, and roadmapId as the program_id
    if (record.phase_id && !record.roadmap_id) {
      record.roadmap_id = record.phase_id;
    }
    if (record.phase_id && record.roadmap_id && record.phase_id !== record.roadmap_id) {
      const programId = record.roadmap_id;
      record.roadmap_id = record.phase_id;
      record.program_id = programId;
    }
    // Remove phase_id — training_roadmap table has no such column
    delete record.phase_id;
    if (!record.phase_name) record.phase_name = record.roadmap_name || 'Phase';
    if (record.phase_order === null || record.phase_order === undefined) record.phase_order = 1;
    if (!record.roadmap_name) record.roadmap_name = record.phase_name || 'Roadmap';
  }

  if (table === 'content') {
    if (!record.title) record.title = isDeleteRecord ? '(deleted)' : 'N/A';
    if (!record.content_type) record.content_type = 'GENERAL_ARTICLE';
    if (record.author_id === null || record.author_id === undefined) {
      record.author_id = 0;
    }
    if (record.version === null || record.version === undefined) {
      record.version = 1;
    }
  }

  if (table === 'disease') {
    if (!record.disease_name) record.disease_name = isDeleteRecord ? '(deleted)' : 'N/A';
  }

  if (table === 'medication') {
    if (!record.medication_name) record.medication_name = isDeleteRecord ? '(deleted)' : 'N/A';
  }

  if (table === 'first_aid_guide') {
    if (!record.guide_title) record.guide_title = isDeleteRecord ? '(deleted)' : 'N/A';
    if (!record.emergency_type) record.emergency_type = 'OTHER';
  }

  if (table === 'training_method') {
    if (!record.method_name) record.method_name = isDeleteRecord ? '(deleted)' : 'N/A';
  }

  if (table === 'nutrition_standard') {
    if (!record.ration_code) record.ration_code = `DEL_${record.standard_id || Date.now()}`;
    if (!record.ration_name) record.ration_name = isDeleteRecord ? '(deleted)' : 'N/A';
  }

  if (table === 'development_stage') {
    if (!record.stage_name) record.stage_name = isDeleteRecord ? '(deleted)' : 'N/A';
    if (record.age_min_months === null || record.age_min_months === undefined) record.age_min_months = 0;
    if (record.age_max_months === null || record.age_max_months === undefined) record.age_max_months = 0;
    if (record.stage_order === null || record.stage_order === undefined) record.stage_order = 0;
  }

  if (table === 'symptom') {
    if (!record.symptom_code) record.symptom_code = `DEL_${record.symptom_id || Date.now()}`;
    if (!record.symptom_name) record.symptom_name = isDeleteRecord ? '(deleted)' : 'N/A';
    if (!record.category) record.category = 'OTHER';
  }

  if (table === 'dog_profile') {
    if (!record.dog_code) record.dog_code = `DEL_${record.dog_id || Date.now()}`;
    if (!record.gender) record.gender = 'MALE';
  }

  if (table === 'dog_assignment') {
    if (!record.start_date) record.start_date = record.created_at || new Date().toISOString();
  }

  return record;
};

const parseBreedId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const ensureReferencedBreeds = async (records: Record<string, unknown>[]): Promise<void> => {
  const referencedBreedIds = Array.from(
    new Set(
      records
        .map((record) => parseBreedId(record.breed_id))
        .filter((breedId): breedId is number => breedId !== null),
    ),
  );

  if (referencedBreedIds.length === 0) {
    return;
  }

  const existingRows = await Promise.all(
    referencedBreedIds.map((breedId) =>
      db.getFirstAsync<{ breed_id: number }>(
        'SELECT breed_id FROM dog_breed WHERE breed_id = ?',
        [breedId],
      ),
    ),
  );

  const missingBreedIds = referencedBreedIds.filter(
    (breedId, index) => !existingRows[index],
  );

  if (missingBreedIds.length === 0) {
    return;
  }

  const now = new Date().toISOString();
  const placeholderBreeds = missingBreedIds.map((breedId) => ({
    breed_id: breedId,
    breed_name: `Giống chó #${breedId}`,
    origin: null,
    description: 'Bản ghi tạm được tạo để giữ liên kết dữ liệu đồng bộ.',
    size_classification: null,
    weight_male_min_kg: null,
    weight_male_max_kg: null,
    weight_female_min_kg: null,
    weight_female_max_kg: null,
    avg_height_cm: null,
    lifespan_years: null,
    trainability_level: null,
    operational_capabilities: null,
    metadata: null,
    image_url: null,
    status: 'DRAFT' as const,
    created_by: null,
    created_at: now,
    updated_at: now,
    is_deleted: 0,
    deleted_at: null,
    _sync_version: 0,
  }));

  await breedDBService.upsertFromServer(placeholderBreeds);
  console.warn(
    `[SYNC:PULL] dog_breed: created ${placeholderBreeds.length} placeholder record(s) for referenced breed ids`,
  );
};

export const pullServerUpdates = async (onProgress?: ProgressCallback): Promise<PullResult> => {
  const results: Record<string, number> = {};

  const allMetadata = await syncMetadataDBService.getAll();
  const syncTimestamps = allMetadata
    .filter((metadata) => metadata.sync_status !== 'NEVER' && metadata.last_sync_at)
    .map((metadata) => metadata.last_sync_at as string);
  const oldestSync = syncTimestamps.length > 0 ? syncTimestamps.sort()[0] : undefined;

  const params: Record<string, string> = {};
  if (oldestSync) {
    params.since = oldestSync;
  }

  const apiResponse = (await apiClient.get('/sync/pull', { params })) as {
    data?: {
      data?: Record<string, Record<string, unknown>[]>;
      syncTimestamp?: string;
    };
  };

  const syncResponse = apiResponse.data;
  const entityData = syncResponse?.data || {};

  for (let index = 0; index < PULL_KEYS.length; index += 1) {
    const key = PULL_KEYS[index];
    const { table, dbService } = PULL_KEY_TO_TABLE[key];
    onProgress?.('pull', table, index + 1, PULL_KEYS.length);

    try {
      const rawRecords = entityData[key] || [];
      const needsAudit = !JUNCTION_TABLES.has(table);
      const records = rawRecords.map((record) =>
        normalizeRecordForTable(table, toSnakeCaseRecord(record, needsAudit)),
      );

      if (records.length > 0) {
        if (TABLES_WITH_BREED_REFERENCE.has(table)) {
          await ensureReferencedBreeds(records);
        }

        const disableForeignKeys = JUNCTION_TABLES.has(table);
        if (disableForeignKeys) {
          db.execSync('PRAGMA foreign_keys = OFF;');
        }

        try {
          await dbService.upsertFromServer(records);
        } finally {
          if (disableForeignKeys) {
            db.execSync('PRAGMA foreign_keys = ON;');
          }
        }
      }

      const recordCount = await dbService.getCount();
      await syncMetadataDBService.updateAfterSync(table, recordCount, 'SUCCESS');

      results[table] = rawRecords.length;
      console.log(`[SYNC:PULL] ${table}: ${rawRecords.length} records`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[SYNC:PULL] ${table}: failed -`, message);
      await syncMetadataDBService.markFailed(table);
      results[table] = -1;
    }
  }

  for (const serverKey of Object.keys(entityData)) {
    if (!(serverKey in PULL_KEY_TO_TABLE)) {
      console.warn(`[SYNC:PULL] Unknown key from server: "${serverKey}" - skipping`);
    }
  }

  return { tables: results };
};

export const isInitialSyncNeeded = async (): Promise<boolean> => {
  const neverSynced = await syncMetadataDBService.getNeverSynced();
  return neverSynced.length >= PULL_KEYS.length * 0.8;
};

export const PULL_TABLE_COUNT = PULL_KEYS.length;
