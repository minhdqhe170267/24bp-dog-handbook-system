import { db } from './index';
import { runMigrations } from './migrations';

// ──────────────────────────────────────────────────────────────
// Group A — Content tables (Server → Mobile, read-only reference data)
// Mirror backend entities. Mobile pulls via /sync/pull.
// _sync_version tracks delta sync per row.
// ──────────────────────────────────────────────────────────────

const GROUP_A_TABLES = `
-- ─── dog_breed ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dog_breed (
  breed_id        INTEGER PRIMARY KEY,
  breed_name      TEXT    NOT NULL,
  origin          TEXT,
  description     TEXT,
  size_classification TEXT,
  weight_male_min_kg  REAL,
  weight_male_max_kg  REAL,
  weight_female_min_kg REAL,
  weight_female_max_kg REAL,
  avg_height_cm   REAL,
  lifespan_years  TEXT,
  trainability_level TEXT,
  operational_capabilities TEXT,
  metadata        TEXT,
  image_url       TEXT,
  status          TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by      INTEGER,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT,
  _sync_version   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dog_breed_updated_at ON dog_breed(updated_at);
CREATE INDEX IF NOT EXISTS idx_dog_breed_status ON dog_breed(status);

-- ─── development_stage ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS development_stage (
  stage_id        INTEGER PRIMARY KEY,
  breed_id        INTEGER NOT NULL REFERENCES dog_breed(breed_id),
  stage_name      TEXT    NOT NULL,
  age_min_months  INTEGER NOT NULL,
  age_max_months  INTEGER NOT NULL,
  stage_order     INTEGER NOT NULL,
  physical_milestones  TEXT,
  behavioral_milestones TEXT,
  training_notes  TEXT,
  nutrition_notes TEXT,
  status          TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by      INTEGER,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT,
  _sync_version   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dev_stage_breed ON development_stage(breed_id);
CREATE INDEX IF NOT EXISTS idx_dev_stage_updated_at ON development_stage(updated_at);

-- ─── disease ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disease (
  disease_id      INTEGER PRIMARY KEY,
  disease_name    TEXT    NOT NULL,
  description     TEXT,
  symptom_summary TEXT,
  treatment_guidelines TEXT,
  prevention_measures  TEXT,
  severity_level  TEXT,
  is_contagious   INTEGER NOT NULL DEFAULT 0,
  incubation_period TEXT,
  status          TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by      INTEGER,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT,
  _sync_version   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_disease_updated_at ON disease(updated_at);
CREATE INDEX IF NOT EXISTS idx_disease_status ON disease(status);

-- ─── symptom ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symptom (
  symptom_id         INTEGER PRIMARY KEY,
  symptom_code       TEXT    NOT NULL UNIQUE,
  symptom_name       TEXT    NOT NULL,
  category           TEXT    NOT NULL,
  severity_indicator INTEGER NOT NULL DEFAULT 1,
  description        TEXT,
  created_at         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL,
  _sync_version      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_symptom_category ON symptom(category);
CREATE INDEX IF NOT EXISTS idx_symptom_updated_at ON symptom(updated_at);

-- ─── disease_symptom_mapping ─────────────────────────────────
CREATE TABLE IF NOT EXISTS disease_symptom_mapping (
  mapping_id  INTEGER PRIMARY KEY,
  disease_id  INTEGER NOT NULL REFERENCES disease(disease_id),
  symptom_id  INTEGER NOT NULL REFERENCES symptom(symptom_id),
  weight      REAL    NOT NULL DEFAULT 0.50,
  is_primary  INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,
  _sync_version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dsm_disease ON disease_symptom_mapping(disease_id);
CREATE INDEX IF NOT EXISTS idx_dsm_symptom ON disease_symptom_mapping(symptom_id);

-- ─── medication ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medication (
  medication_id    INTEGER PRIMARY KEY,
  medication_name  TEXT    NOT NULL,
  description      TEXT,
  dosage_instructions    TEXT,
  administration_method  TEXT,
  side_effects     TEXT,
  contraindications TEXT,
  storage_requirements TEXT,
  image_url        TEXT,
  status           TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by       INTEGER,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  is_deleted       INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  _sync_version    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_medication_updated_at ON medication(updated_at);
CREATE INDEX IF NOT EXISTS idx_medication_status ON medication(status);

-- ─── first_aid_guide ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS first_aid_guide (
  guide_id         INTEGER PRIMARY KEY,
  guide_title      TEXT    NOT NULL,
  emergency_type   TEXT    NOT NULL,
  description      TEXT,
  immediate_steps  TEXT    NOT NULL,
  required_materials TEXT,
  do_not_actions   TEXT,
  when_to_seek_vet TEXT,
  image_url        TEXT,
  status           TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by       INTEGER,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  is_deleted       INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  _sync_version    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_first_aid_updated_at ON first_aid_guide(updated_at);
CREATE INDEX IF NOT EXISTS idx_first_aid_status ON first_aid_guide(status);

-- ─── training_method ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_method (
  method_id    INTEGER PRIMARY KEY,
  method_name  TEXT    NOT NULL,
  description  TEXT,
  advantages   TEXT,
  disadvantages TEXT,
  instructions TEXT,
  status       TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by   INTEGER,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL,
  is_deleted   INTEGER NOT NULL DEFAULT 0,
  deleted_at   TEXT,
  _sync_version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_training_method_updated_at ON training_method(updated_at);
CREATE INDEX IF NOT EXISTS idx_training_method_status ON training_method(status);

-- ─── training_exercise ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_exercise (
  exercise_id      INTEGER PRIMARY KEY,
  exercise_name    TEXT    NOT NULL,
  description      TEXT,
  difficulty_level TEXT    NOT NULL,
  method_id        INTEGER REFERENCES training_method(method_id),
  instructions     TEXT,
  duration_minutes INTEGER,
  safety_precautions  TEXT,
  required_equipment  TEXT,
  media_urls       TEXT,
  status           TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by       INTEGER,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL,
  is_deleted       INTEGER NOT NULL DEFAULT 0,
  deleted_at       TEXT,
  _sync_version    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_exercise_method ON training_exercise(method_id);
CREATE INDEX IF NOT EXISTS idx_exercise_updated_at ON training_exercise(updated_at);
CREATE INDEX IF NOT EXISTS idx_exercise_difficulty ON training_exercise(difficulty_level);

-- ─── training_roadmap ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_roadmap (
  roadmap_id          INTEGER PRIMARY KEY,
  roadmap_name        TEXT    NOT NULL,
  breed_id            INTEGER REFERENCES dog_breed(breed_id),
  target_role         TEXT,
  description         TEXT,
  total_duration_weeks INTEGER,
  phase_name          TEXT    NOT NULL,
  phase_order         INTEGER NOT NULL,
  phase_duration_weeks INTEGER,
  phase_objectives    TEXT,
  assessment_criteria TEXT,
  status              TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by          INTEGER,
  created_at          TEXT    NOT NULL,
  updated_at          TEXT    NOT NULL,
  is_deleted          INTEGER NOT NULL DEFAULT 0,
  deleted_at          TEXT,
  _sync_version       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_roadmap_breed ON training_roadmap(breed_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_updated_at ON training_roadmap(updated_at);

-- ─── roadmap_exercise ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_exercise (
  roadmap_exercise_id INTEGER PRIMARY KEY,
  roadmap_id          INTEGER NOT NULL REFERENCES training_roadmap(roadmap_id),
  exercise_id         INTEGER NOT NULL REFERENCES training_exercise(exercise_id),
  exercise_order      INTEGER NOT NULL,
  is_mandatory        INTEGER NOT NULL DEFAULT 1,
  _sync_version       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_re_roadmap ON roadmap_exercise(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_re_exercise ON roadmap_exercise(exercise_id);

-- ─── nutrition_standard ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_standard (
  standard_id          INTEGER PRIMARY KEY,
  breed_id             INTEGER NOT NULL REFERENCES dog_breed(breed_id),
  ration_code          TEXT    NOT NULL UNIQUE,
  ration_name          TEXT    NOT NULL,
  description          TEXT,
  target_age_min_months INTEGER,
  target_age_max_months INTEGER,
  activity_level       TEXT,
  health_condition     TEXT,
  metadata             TEXT,
  special_notes        TEXT,
  status               TEXT    NOT NULL DEFAULT 'DRAFT',
  created_by           INTEGER,
  created_at           TEXT    NOT NULL,
  updated_at           TEXT    NOT NULL,
  is_deleted           INTEGER NOT NULL DEFAULT 0,
  deleted_at           TEXT,
  _sync_version        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_nutrition_breed ON nutrition_standard(breed_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_updated_at ON nutrition_standard(updated_at);

-- ─── content ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content (
  content_id    INTEGER PRIMARY KEY,
  title         TEXT    NOT NULL,
  content_type  TEXT    NOT NULL,
  body          TEXT,
  summary       TEXT,
  status        TEXT    NOT NULL DEFAULT 'DRAFT',
  author_id     INTEGER NOT NULL,
  published_at  TEXT,
  version       INTEGER NOT NULL DEFAULT 1,
  tags          TEXT,
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL,
  is_deleted    INTEGER NOT NULL DEFAULT 0,
  deleted_at    TEXT,
  _sync_version INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_content_updated_at ON content(updated_at);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
`;

// ──────────────────────────────────────────────────────────────
// Group B — Field data tables (Mobile → Server)
// Created locally by trainer, synced up to backend.
// local_id (UUID) is PRIMARY KEY; server_id is assigned after sync.
// ──────────────────────────────────────────────────────────────

const GROUP_B_TABLES = `
-- ─── dog_profile (synced both ways) ─────────────────────────
CREATE TABLE IF NOT EXISTS dog_profile (
  dog_id          INTEGER PRIMARY KEY,
  dog_code        TEXT    NOT NULL UNIQUE,
  dog_name        TEXT,
  breed_id        INTEGER NOT NULL REFERENCES dog_breed(breed_id),
  birth_date      TEXT,
  gender          TEXT    NOT NULL,
  current_weight_kg REAL,
  height_cm       REAL,
  color           TEXT,
  microchip_id    TEXT,
  status          TEXT    NOT NULL DEFAULT 'ACTIVE',
  assignment_date TEXT,
  is_sterilized   INTEGER NOT NULL DEFAULT 0,
  image_url       TEXT,
  notes           TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT,
  _sync_version   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dog_breed ON dog_profile(breed_id);
CREATE INDEX IF NOT EXISTS idx_dog_status ON dog_profile(status);

-- ─── dog_assignment ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dog_assignment (
  assignment_id   INTEGER PRIMARY KEY,
  trainer_id      INTEGER NOT NULL,
  dog_id          INTEGER NOT NULL REFERENCES dog_profile(dog_id),
  assignment_type TEXT    NOT NULL DEFAULT 'PRIMARY',
  start_date      TEXT    NOT NULL,
  end_date        TEXT,
  is_active       INTEGER NOT NULL DEFAULT 1,
  notes           TEXT,
  trainer_name    TEXT,
  dog_name        TEXT,
  dog_code        TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  _sync_version   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_assignment_trainer ON dog_assignment(trainer_id);
CREATE INDEX IF NOT EXISTS idx_assignment_dog ON dog_assignment(dog_id);

-- ─── field_note (Mobile → Server) ───────────────────────────
CREATE TABLE IF NOT EXISTS field_note (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  trainer_id      INTEGER NOT NULL,
  dog_id          INTEGER REFERENCES dog_profile(dog_id),
  title           TEXT    NOT NULL,
  content         TEXT    NOT NULL,
  photo_urls      TEXT,
  recording_date  TEXT    NOT NULL,
  location        TEXT,
  linked_content_id INTEGER,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_fn_trainer ON field_note(trainer_id);
CREATE INDEX IF NOT EXISTS idx_fn_dog ON field_note(dog_id);
CREATE INDEX IF NOT EXISTS idx_fn_sync ON field_note(sync_status);

-- ─── health_record (Mobile → Server) ────────────────────────
CREATE TABLE IF NOT EXISTS health_record (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  dog_id          INTEGER NOT NULL REFERENCES dog_profile(dog_id),
  examiner_id     INTEGER NOT NULL,
  examination_date TEXT   NOT NULL,
  weight_kg       REAL,
  temperature_c   REAL,
  feces_status    TEXT    DEFAULT 'NOT_CHECKED',
  appetite_level  TEXT,
  activity_level  TEXT,
  observed_symptoms TEXT,
  diagnosis       TEXT,
  treatment_given TEXT,
  next_checkup_date TEXT,
  notes           TEXT,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_hr_dog ON health_record(dog_id);
CREATE INDEX IF NOT EXISTS idx_hr_sync ON health_record(sync_status);
CREATE INDEX IF NOT EXISTS idx_hr_examiner ON health_record(examiner_id);

-- ─── health_session (Mobile → Server) ───────────────────────
CREATE TABLE IF NOT EXISTS health_session (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  dog_id          INTEGER NOT NULL REFERENCES dog_profile(dog_id),
  trainer_id      INTEGER NOT NULL,
  issue_summary   TEXT    NOT NULL,
  initial_diagnosis_id INTEGER,
  status          TEXT    NOT NULL DEFAULT 'ACTIVE',
  severity        TEXT    NOT NULL DEFAULT 'MEDIUM',
  started_at      TEXT    NOT NULL,
  last_update_at  TEXT    NOT NULL,
  follow_up_date  TEXT,
  resolution_notes TEXT,
  resolved_at     TEXT,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hs_dog ON health_session(dog_id);
CREATE INDEX IF NOT EXISTS idx_hs_sync ON health_session(sync_status);

-- ─── session_follow_up (Mobile → Server) ────────────────────
CREATE TABLE IF NOT EXISTS session_follow_up (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  session_local_id TEXT   NOT NULL,
  followup_date   TEXT    NOT NULL,
  status_update   TEXT    NOT NULL,
  notes           TEXT,
  weight_kg       REAL,
  temperature_c   REAL,
  next_action     TEXT,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sfu_session ON session_follow_up(session_local_id);
CREATE INDEX IF NOT EXISTS idx_sfu_sync ON session_follow_up(sync_status);

-- ─── content_suggestion (Mobile → Server) ────────────────────
CREATE TABLE IF NOT EXISTS content_suggestion (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  trainer_id      INTEGER NOT NULL,
  suggestion_type TEXT    NOT NULL,
  related_exercise_id INTEGER,
  title           TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'SUBMITTED',
  admin_response  TEXT,
  reviewed_by     INTEGER,
  reviewed_at     TEXT,
  submitted_at    TEXT    NOT NULL,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cs_trainer ON content_suggestion(trainer_id);
CREATE INDEX IF NOT EXISTS idx_cs_sync ON content_suggestion(sync_status);

-- ─── weight_assessment (Mobile → Server) ─────────────────────
CREATE TABLE IF NOT EXISTS weight_assessment (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  dog_id          INTEGER NOT NULL REFERENCES dog_profile(dog_id),
  assessor_id     INTEGER NOT NULL,
  recorded_weight_kg REAL NOT NULL,
  standard_min_kg REAL    NOT NULL,
  standard_max_kg REAL    NOT NULL,
  status          TEXT    NOT NULL,
  deviation_percent REAL,
  recommendation  TEXT,
  follow_up_weeks INTEGER,
  assessed_at     TEXT    NOT NULL,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wa_dog ON weight_assessment(dog_id);
CREATE INDEX IF NOT EXISTS idx_wa_sync ON weight_assessment(sync_status);

-- ─── operation_report (Mobile → Server) ──────────────────────
CREATE TABLE IF NOT EXISTS operation_report (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  trainer_id      INTEGER NOT NULL,
  dog_id          INTEGER NOT NULL REFERENCES dog_profile(dog_id),
  report_type     TEXT    NOT NULL,
  report_title    TEXT    NOT NULL,
  report_date     TEXT    NOT NULL,
  report_content  TEXT,
  metadata        TEXT,
  export_url      TEXT,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  is_deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_or_trainer ON operation_report(trainer_id);
CREATE INDEX IF NOT EXISTS idx_or_dog ON operation_report(dog_id);
CREATE INDEX IF NOT EXISTS idx_or_sync ON operation_report(sync_status);

-- ─── diagnosis_record (Mobile → Server) ──────────────────────
CREATE TABLE IF NOT EXISTS diagnosis_record (
  local_id        TEXT    PRIMARY KEY,
  server_id       INTEGER,
  dog_id          INTEGER NOT NULL REFERENCES dog_profile(dog_id),
  trainer_id      INTEGER NOT NULL,
  selected_symptoms TEXT  NOT NULL,
  matched_disease_id INTEGER,
  match_score     REAL,
  all_results     TEXT,
  action_taken    TEXT,
  diagnosed_at    TEXT    NOT NULL,
  sync_status     TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(sync_status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dr_dog ON diagnosis_record(dog_id);
CREATE INDEX IF NOT EXISTS idx_dr_sync ON diagnosis_record(sync_status);
`;

// ──────────────────────────────────────────────────────────────
// Group C — Sync infrastructure (SQLite-only, not mirrored on server)
// ──────────────────────────────────────────────────────────────

const GROUP_C_TABLES = `
-- ─── sync_queue (offline write queue) ────────────────────────
CREATE TABLE IF NOT EXISTS sync_queue (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type   TEXT    NOT NULL,
  entity_id     TEXT    NOT NULL,
  action        TEXT    NOT NULL CHECK(action IN ('CREATE','UPDATE','DELETE')),
  payload       TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'PENDING'
                CHECK(status IN ('PENDING','SYNCED','FAILED','CONFLICT')),
  retry_count   INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  synced_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_sq_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sq_entity ON sync_queue(entity_type, entity_id);

-- ─── sync_metadata (per-table sync tracking) ─────────────────
CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name   TEXT PRIMARY KEY,
  last_sync_at TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  sync_status  TEXT    NOT NULL DEFAULT 'NEVER'
               CHECK(sync_status IN ('NEVER','SUCCESS','PARTIAL','FAILED'))
);

-- ─── sync_conflict_log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_conflict_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type   TEXT    NOT NULL,
  entity_id     TEXT    NOT NULL,
  local_data    TEXT    NOT NULL,
  server_data   TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'PENDING'
                CHECK(status IN ('PENDING','RESOLVED','DISMISSED')),
  resolved_by   TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_scl_status ON sync_conflict_log(status);
CREATE INDEX IF NOT EXISTS idx_scl_entity ON sync_conflict_log(entity_type, entity_id);

-- ─── offline_cache (key-value store for drafts, prefs, etc.) ─
CREATE TABLE IF NOT EXISTS offline_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  expires_at TEXT
);

-- ─── user_session (singleton — persists login across restarts)
CREATE TABLE IF NOT EXISTS user_session (
  id              INTEGER PRIMARY KEY CHECK(id = 1),
  user_id         INTEGER,
  username        TEXT,
  full_name       TEXT,
  role            TEXT,
  military_rank   TEXT,
  unit            TEXT,
  token           TEXT,
  refresh_token   TEXT,
  token_expires_at TEXT,
  password_hash   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── training_progress (local exercise progress tracking) ────
CREATE TABLE IF NOT EXISTS training_progress (
  exercise_id  INTEGER PRIMARY KEY,
  status       TEXT    NOT NULL DEFAULT 'NOT_STARTED'
               CHECK(status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
  started_at   TEXT,
  completed_at TEXT,
  updated_at   TEXT    NOT NULL
);
`;

// ──────────────────────────────────────────────────────────────
// Seed sync_metadata rows for every syncable table
// ──────────────────────────────────────────────────────────────

const SYNCABLE_TABLES = [
  'dog_breed',
  'development_stage',
  'disease',
  'symptom',
  'disease_symptom_mapping',
  'medication',
  'first_aid_guide',
  'training_method',
  'training_exercise',
  'training_roadmap',
  'roadmap_exercise',
  'nutrition_standard',
  'content',
  'dog_profile',
  'dog_assignment',
] as const;

const SEED_SYNC_METADATA = SYNCABLE_TABLES
  .map(
    (t) =>
      `INSERT OR IGNORE INTO sync_metadata (table_name, last_sync_at, record_count, sync_status) VALUES ('${t}', NULL, 0, 'NEVER');`
  )
  .join('\n');

// ──────────────────────────────────────────────────────────────
// initDatabase — called once at app startup from _layout.tsx
// ──────────────────────────────────────────────────────────────

const ensureColumnExists = (tableName: string, columnName: string, definition: string): void => {
  const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  if (!cols.some((c) => c.name === columnName)) {
    db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
};

export const initDatabase = async (): Promise<void> => {
  // Enable foreign keys
  db.execSync('PRAGMA foreign_keys = ON;');
  // WAL mode for better concurrent read/write performance
  db.execSync('PRAGMA journal_mode = WAL;');

  // Create all tables
  db.execSync(GROUP_A_TABLES);
  db.execSync(GROUP_B_TABLES);
  db.execSync(GROUP_C_TABLES);

  // Ensure password_hash column exists for offline login (safe for existing DBs)
  ensureColumnExists('user_session', 'password_hash', 'TEXT');

  // Seed sync_metadata
  db.execSync(SEED_SYNC_METADATA);

  // Run any pending migrations
  await runMigrations(db);
};

export { SYNCABLE_TABLES };
