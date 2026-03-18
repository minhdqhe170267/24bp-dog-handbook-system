/**
 * Generic Row ↔ API type converters.
 *
 * Row types use snake_case (SQLite columns).
 * API types use camelCase (server JSON / component props).
 */

// Fields to strip when converting Row → API
const SKIP_FIELDS = new Set([
  '_sync_version',
  'is_deleted',
  'deleted_at',
  'sync_status',
  'server_id',
  'created_by',
]);

/**
 * Convert a SQLite Row (snake_case) to an API type (camelCase).
 * Skips internal DB fields. Converts is_* 0/1 → boolean.
 * @param aliases — override specific field name mappings (dbKey → apiKey)
 */
export function rowToApi<T>(
  row: Record<string, any>,
  aliases: Record<string, string> = {},
): T {
  const result: any = {};
  for (const [key, value] of Object.entries(row)) {
    if (SKIP_FIELDS.has(key)) continue;

    const apiKey =
      aliases[key] ||
      key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

    // Convert 0/1 → boolean for is_* fields
    if (
      key.startsWith('is_') &&
      typeof value === 'number' &&
      (value === 0 || value === 1)
    ) {
      result[apiKey] = value === 1;
    } else {
      result[apiKey] = value;
    }
  }
  return result as T;
}

/**
 * Convert an API object (camelCase) to a SQLite Row (snake_case).
 * Only keeps fields present in `columns` (avoids inserting unknown columns).
 * Converts boolean → 0/1. Adds defaults for audit fields.
 * @param aliases — override specific field name mappings (apiKey → dbKey)
 */
export function apiToRow(
  data: Record<string, any>,
  columns: string[],
  aliases: Record<string, string> = {},
): Record<string, any> {
  const colSet = new Set(columns);
  const result: any = {};
  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const dbKey =
      aliases[key] ||
      key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

    if (!colSet.has(dbKey)) continue;

    result[dbKey] =
      typeof value === 'boolean' ? (value ? 1 : 0) : value;
  }

  // Defaults for common audit fields
  if (colSet.has('created_at') && !result.created_at) result.created_at = now;
  if (colSet.has('updated_at') && !result.updated_at) result.updated_at = now;
  if (colSet.has('is_deleted') && result.is_deleted == null) result.is_deleted = 0;
  if (colSet.has('_sync_version') && result._sync_version == null) result._sync_version = 0;
  if (colSet.has('deleted_at') && result.deleted_at === undefined) result.deleted_at = null;

  return result;
}

// ──────────────────────────────────────────────────────────────
// Per-entity column lists (match SQLite CREATE TABLE columns)
// ──────────────────────────────────────────────────────────────

export const BREED_COLS = [
  'breed_id', 'breed_name', 'origin', 'description', 'size_classification',
  'weight_male_min_kg', 'weight_male_max_kg', 'weight_female_min_kg', 'weight_female_max_kg',
  'avg_height_cm', 'lifespan_years', 'trainability_level', 'operational_capabilities',
  'metadata', 'image_url', 'status', 'created_by', 'created_at', 'updated_at',
  'is_deleted', 'deleted_at', '_sync_version',
];

export const DISEASE_COLS = [
  'disease_id', 'disease_name', 'description', 'symptom_summary',
  'treatment_guidelines', 'prevention_measures', 'severity_level',
  'is_contagious', 'incubation_period', 'status', 'created_by',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

export const SYMPTOM_COLS = [
  'symptom_id', 'symptom_code', 'symptom_name', 'category',
  'severity_indicator', 'description', 'created_at', 'updated_at', '_sync_version',
];

export const MEDICATION_COLS = [
  'medication_id', 'medication_name', 'description', 'dosage_instructions',
  'administration_method', 'side_effects', 'contraindications',
  'storage_requirements', 'image_url', 'status', 'created_by',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

export const FIRST_AID_COLS = [
  'guide_id', 'guide_title', 'emergency_type', 'description',
  'immediate_steps', 'required_materials', 'do_not_actions',
  'when_to_seek_vet', 'image_url', 'status', 'created_by',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

export const TRAINING_METHOD_COLS = [
  'method_id', 'method_name', 'description', 'advantages', 'disadvantages',
  'instructions', 'status', 'created_by', 'created_at', 'updated_at',
  'is_deleted', 'deleted_at', '_sync_version',
];

export const EXERCISE_COLS = [
  'exercise_id', 'exercise_name', 'description', 'difficulty_level',
  'method_id', 'instructions', 'duration_minutes', 'safety_precautions',
  'required_equipment', 'media_urls', 'status', 'created_by',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

export const ROADMAP_COLS = [
  'roadmap_id', 'roadmap_name', 'breed_id', 'target_role', 'description',
  'total_duration_weeks', 'phase_name', 'phase_order', 'phase_duration_weeks',
  'phase_objectives', 'assessment_criteria', 'status', 'created_by',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

export const NUTRITION_COLS = [
  'standard_id', 'breed_id', 'ration_code', 'ration_name', 'description',
  'target_age_min_months', 'target_age_max_months', 'activity_level',
  'health_condition', 'metadata', 'special_notes', 'status', 'created_by',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

export const DOG_PROFILE_COLS = [
  'dog_id', 'dog_code', 'dog_name', 'breed_id', 'birth_date', 'gender',
  'current_weight_kg', 'height_cm', 'color', 'microchip_id', 'status',
  'assignment_date', 'is_sterilized', 'image_url', 'notes',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

export const ASSIGNMENT_COLS = [
  'assignment_id', 'trainer_id', 'dog_id', 'assignment_type', 'start_date',
  'end_date', 'is_active', 'notes', 'created_at', 'updated_at', '_sync_version',
];

export const CONTENT_COLS = [
  'content_id', 'title', 'content_type', 'body', 'summary', 'status',
  'author_id', 'published_at', 'version', 'tags',
  'created_at', 'updated_at', 'is_deleted', 'deleted_at', '_sync_version',
];

// ──────────────────────────────────────────────────────────────
// Entity-specific aliases (for fields where snake↔camel doesn't match)
// ──────────────────────────────────────────────────────────────

/** Row → API aliases for DogProfile */
export const DOG_PROFILE_ROW_ALIASES: Record<string, string> = {
  birth_date: 'dateOfBirth',
};

/** API → Row aliases for DogProfile */
export const DOG_PROFILE_API_ALIASES: Record<string, string> = {
  dateOfBirth: 'birth_date',
};
