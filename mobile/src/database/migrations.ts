import type * as SQLite from 'expo-sqlite';

interface Migration {
  version: number;
  description: string;
  run: (db: SQLite.SQLiteDatabase) => void;
}

const getColumnNames = (db: SQLite.SQLiteDatabase, tableName: string): Set<string> => {
  const rows = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  return new Set(rows.map((row) => row.name));
};

const addColumnIfMissing = (
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string,
): void => {
  const existingColumns = getColumnNames(db, tableName);
  if (existingColumns.has(columnName)) {
    return;
  }

  db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
};

/**
 * Migrations array — append-only. Never modify existing entries.
 * Each migration bumps PRAGMA user_version by 1 after success.
 */
const migrations: Migration[] = [
  // All columns from previous migrations (v2-v5) are now in CREATE TABLE statements in schema.ts
  {
    version: 6,
    description: 'Add disease_medication_mapping and disease_first_aid_mapping tables',
    run: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS disease_medication_mapping (
          mapping_id    INTEGER PRIMARY KEY,
          disease_id    INTEGER NOT NULL REFERENCES disease(disease_id),
          medication_id INTEGER NOT NULL REFERENCES medication(medication_id),
          priority      INTEGER NOT NULL DEFAULT 1,
          notes         TEXT,
          _sync_version INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_dmm_disease ON disease_medication_mapping(disease_id);

        CREATE TABLE IF NOT EXISTS disease_first_aid_mapping (
          mapping_id INTEGER PRIMARY KEY,
          disease_id INTEGER NOT NULL REFERENCES disease(disease_id),
          guide_id   INTEGER NOT NULL REFERENCES first_aid_guide(guide_id),
          priority   INTEGER NOT NULL DEFAULT 1,
          notes      TEXT,
          _sync_version INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_dfam_disease ON disease_first_aid_mapping(disease_id);
      `);
      db.execSync(`INSERT OR IGNORE INTO sync_metadata (table_name, last_sync_at, record_count, sync_status) VALUES ('disease_medication_mapping', NULL, 0, 'NEVER');`);
      db.execSync(`INSERT OR IGNORE INTO sync_metadata (table_name, last_sync_at, record_count, sync_status) VALUES ('disease_first_aid_mapping', NULL, 0, 'NEVER');`);
    },
  },
];

/**
 * Reads current PRAGMA user_version, runs any migrations above that version.
 */
export const runMigrations = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  const pending = migrations.filter((migration) => migration.version > currentVersion);
  if (pending.length === 0) {
    if (currentVersion === 0) {
      const latestVersion = migrations.at(-1)?.version ?? 1;
      db.execSync(`PRAGMA user_version = ${latestVersion};`);
    }
    return;
  }

  for (const migration of pending) {
    try {
      db.execSync('BEGIN TRANSACTION;');
      migration.run(db);
      db.execSync(`PRAGMA user_version = ${migration.version};`);
      db.execSync('COMMIT;');
    } catch (error) {
      db.execSync('ROLLBACK;');
      throw new Error(
        `Migration v${migration.version} (${migration.description}) failed: ${error}`,
      );
    }
  }
};
