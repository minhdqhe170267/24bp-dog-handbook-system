// ──────────────────────────────────────────────────────────────
// Shared enums & types
// ──────────────────────────────────────────────────────────────

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncMetadataStatus = 'NEVER' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type ConflictStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';
export type ExerciseProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type EntityType =
  | 'field_note'
  | 'health_record'
  | 'health_session'
  | 'session_follow_up'
  | 'content_suggestion'
  | 'weight_assessment'
  | 'operation_report'
  | 'diagnosis_record';

// Backend enums (mirrored)
export type ContentStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
export type UserRole = 'ADMIN' | 'TRAINER' | 'CONTENT_EDITOR' | 'REVIEWER';
export type DogGender = 'MALE' | 'FEMALE';
export type DogStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'DECEASED' | 'TRANSFERRED';
export type SizeClassification = 'SMALL' | 'MEDIUM' | 'LARGE' | 'GIANT';
export type TrainabilityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type ActivityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type HealthCondition = 'NORMAL' | 'RECOVERY' | 'SPECIAL';
export type AssignmentType = 'PRIMARY' | 'SECONDARY' | 'TEMPORARY';
export type DifficultyLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
export type SymptomCategory = 'EATING' | 'BEHAVIOR' | 'PHYSICAL' | 'RESPIRATORY' | 'SKIN' | 'OTHER';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AppetiteLevel = 'NORMAL' | 'DECREASED' | 'NONE' | 'INCREASED';
export type FecesStatus = 'NORMAL' | 'BLOOD_PRESENT' | 'ABNORMAL' | 'NOT_CHECKED';
export type DogActivityLevel = 'NORMAL' | 'LOW' | 'VERY_LOW' | 'HYPERACTIVE';
export type ReportType = 'TRAINING' | 'HEALTH';
export type SessionStatus = 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'ESCALATED';
export type SessionSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type FollowUpStatus = 'IMPROVED' | 'SAME' | 'WORSE' | 'RESOLVED';
export type WeightStatus = 'SEVERELY_UNDERWEIGHT' | 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE';
export type SuggestionStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'IMPLEMENTED';
export type SuggestionType = 'NEW_CONTENT' | 'UPDATE_EXISTING' | 'ERROR_REPORT' | 'GENERAL_FEEDBACK';
export type ContentType = 'BREED_INFO' | 'TRAINING_GUIDE' | 'HEALTH_INFO' | 'NUTRITION_GUIDE' | 'FIRST_AID' | 'GENERAL_ARTICLE';

// ──────────────────────────────────────────────────────────────
// Group A — Content tables (read-only, synced from server)
// ──────────────────────────────────────────────────────────────

export interface DogBreedRow {
  breed_id: number;
  breed_name: string;
  origin: string | null;
  description: string | null;
  size_classification: SizeClassification | null;
  weight_male_min_kg: number | null;
  weight_male_max_kg: number | null;
  weight_female_min_kg: number | null;
  weight_female_max_kg: number | null;
  avg_height_cm: number | null;
  lifespan_years: string | null;
  trainability_level: TrainabilityLevel | null;
  operational_capabilities: string | null;
  metadata: string | null;
  image_url: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface DevelopmentStageRow {
  stage_id: number;
  breed_id: number;
  stage_name: string;
  age_min_months: number;
  age_max_months: number;
  stage_order: number;
  physical_milestones: string | null;
  behavioral_milestones: string | null;
  training_notes: string | null;
  nutrition_notes: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface DiseaseRow {
  disease_id: number;
  disease_name: string;
  description: string | null;
  symptom_summary: string | null;
  treatment_guidelines: string | null;
  prevention_measures: string | null;
  severity_level: SeverityLevel | null;
  is_contagious: number;
  incubation_period: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface SymptomRow {
  symptom_id: number;
  symptom_code: string;
  symptom_name: string;
  category: SymptomCategory;
  severity_indicator: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  _sync_version: number;
}

export interface DiseaseSymptomMappingRow {
  mapping_id: number;
  disease_id: number;
  symptom_id: number;
  weight: number;
  is_primary: number;
  notes: string | null;
  _sync_version: number;
}

export interface MedicationRow {
  medication_id: number;
  medication_name: string;
  description: string | null;
  dosage_instructions: string | null;
  administration_method: string | null;
  side_effects: string | null;
  contraindications: string | null;
  storage_requirements: string | null;
  image_url: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface FirstAidGuideRow {
  guide_id: number;
  guide_title: string;
  emergency_type: string;
  description: string | null;
  immediate_steps: string;
  required_materials: string | null;
  do_not_actions: string | null;
  when_to_seek_vet: string | null;
  image_url: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface TrainingMethodRow {
  method_id: number;
  method_name: string;
  description: string | null;
  advantages: string | null;
  disadvantages: string | null;
  instructions: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface TrainingExerciseRow {
  exercise_id: number;
  exercise_name: string;
  description: string | null;
  difficulty_level: DifficultyLevel;
  method_id: number | null;
  instructions: string | null;
  duration_minutes: number | null;
  safety_precautions: string | null;
  required_equipment: string | null;
  media_urls: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface TrainingRoadmapRow {
  roadmap_id: number;
  roadmap_name: string;
  breed_id: number | null;
  target_role: string | null;
  description: string | null;
  total_duration_weeks: number | null;
  phase_name: string;
  phase_order: number;
  phase_duration_weeks: number | null;
  phase_objectives: string | null;
  assessment_criteria: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface RoadmapExerciseRow {
  roadmap_exercise_id: number;
  roadmap_id: number;
  exercise_id: number;
  exercise_order: number;
  is_mandatory: number;
  _sync_version: number;
}

export interface NutritionStandardRow {
  standard_id: number;
  breed_id: number;
  ration_code: string;
  ration_name: string;
  description: string | null;
  target_age_min_months: number | null;
  target_age_max_months: number | null;
  activity_level: ActivityLevel | null;
  health_condition: HealthCondition | null;
  metadata: string | null;
  special_notes: string | null;
  status: ContentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface ContentRow {
  content_id: number;
  title: string;
  content_type: ContentType;
  body: string | null;
  summary: string | null;
  status: ContentStatus;
  author_id: number;
  published_at: string | null;
  version: number;
  tags: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

// ──────────────────────────────────────────────────────────────
// Group B — Field data tables (writable, synced to server)
// ──────────────────────────────────────────────────────────────

export interface DogProfileRow {
  dog_id: number;
  dog_code: string;
  dog_name: string | null;
  breed_id: number;
  birth_date: string | null;
  gender: DogGender;
  current_weight_kg: number | null;
  height_cm: number | null;
  color: string | null;
  microchip_id: string | null;
  status: DogStatus;
  assignment_date: string | null;
  is_sterilized: number;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
  _sync_version: number;
}

export interface DogAssignmentRow {
  assignment_id: number;
  trainer_id: number;
  dog_id: number;
  assignment_type: AssignmentType;
  start_date: string;
  end_date: string | null;
  is_active: number;
  notes: string | null;
  trainer_name: string | null;
  dog_name: string | null;
  dog_code: string | null;
  created_at: string;
  updated_at: string;
  _sync_version: number;
}

export interface FieldNoteRow {
  local_id: string;
  server_id: number | null;
  trainer_id: number;
  dog_id: number | null;
  title: string;
  content: string;
  photo_urls: string | null;
  recording_date: string;
  location: string | null;
  linked_content_id: number | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface HealthRecordRow {
  local_id: string;
  server_id: number | null;
  dog_id: number;
  examiner_id: number;
  examination_date: string;
  weight_kg: number | null;
  temperature_c: number | null;
  feces_status: FecesStatus | null;
  appetite_level: AppetiteLevel | null;
  activity_level: DogActivityLevel | null;
  observed_symptoms: string | null;
  diagnosis: string | null;
  treatment_given: string | null;
  next_checkup_date: string | null;
  notes: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface HealthSessionRow {
  local_id: string;
  server_id: number | null;
  dog_id: number;
  trainer_id: number;
  issue_summary: string;
  initial_diagnosis_id: number | null;
  status: SessionStatus;
  severity: SessionSeverity;
  started_at: string;
  last_update_at: string;
  follow_up_date: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface SessionFollowUpRow {
  local_id: string;
  server_id: number | null;
  session_local_id: string;
  followup_date: string;
  status_update: FollowUpStatus;
  notes: string | null;
  weight_kg: number | null;
  temperature_c: number | null;
  next_action: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentSuggestionRow {
  local_id: string;
  server_id: number | null;
  trainer_id: number;
  suggestion_type: SuggestionType;
  related_exercise_id: number | null;
  title: string;
  description: string;
  status: SuggestionStatus;
  admin_response: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  submitted_at: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface WeightAssessmentRow {
  local_id: string;
  server_id: number | null;
  dog_id: number;
  assessor_id: number;
  recorded_weight_kg: number;
  standard_min_kg: number;
  standard_max_kg: number;
  status: WeightStatus;
  deviation_percent: number | null;
  recommendation: string | null;
  follow_up_weeks: number | null;
  assessed_at: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface OperationReportRow {
  local_id: string;
  server_id: number | null;
  trainer_id: number;
  dog_id: number;
  report_type: ReportType;
  report_title: string;
  report_date: string;
  report_content: string | null;
  metadata: string | null;
  export_url: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface DiagnosisRecordRow {
  local_id: string;
  server_id: number | null;
  dog_id: number;
  trainer_id: number;
  selected_symptoms: string;
  matched_disease_id: number | null;
  match_score: number | null;
  all_results: string | null;
  action_taken: string | null;
  diagnosed_at: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────────────────
// Group C — Sync infrastructure tables
// ──────────────────────────────────────────────────────────────

export interface SyncQueueRow {
  id: number;
  entity_type: EntityType;
  entity_id: string;
  action: SyncAction;
  payload: string;
  status: SyncStatus;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface SyncMetadataRow {
  table_name: string;
  last_sync_at: string | null;
  record_count: number;
  sync_status: SyncMetadataStatus;
}

export interface SyncConflictLogRow {
  id: number;
  entity_type: string;
  entity_id: string;
  local_data: string;
  server_data: string;
  status: ConflictStatus;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface OfflineCacheRow {
  key: string;
  value: string;
  expires_at: string | null;
}

export interface UserSessionRow {
  id: 1;
  user_id: number | null;
  username: string | null;
  full_name: string | null;
  role: UserRole | null;
  military_rank: string | null;
  unit: string | null;
  token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  password_hash: string | null;
  created_at: string;
}

export interface TrainingProgressRow {
  exercise_id: number;
  status: ExerciseProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}
