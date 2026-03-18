import type * as SQLite from 'expo-sqlite';

interface Migration {
  version: number;
  description: string;
  sql: string[];
}

/**
 * Migrations array — append-only. Never modify existing entries.
 * Each migration bumps PRAGMA user_version by 1.
 */
const migrations: Migration[] = [
  // Version 1 is the initial schema created by schema.ts.
  // Future migrations go here:
  // {
  //   version: 2,
  //   description: 'Add xyz column to field_note',
  //   sql: ['ALTER TABLE field_note ADD COLUMN xyz TEXT;'],
  // },
];

/**
 * Reads current PRAGMA user_version, runs any migrations above that version.
 */
export const runMigrations = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const row = db.getFirstSync<{ user_version: number }>(
    'PRAGMA user_version;'
  );
  const currentVersion = row?.user_version ?? 0;

  // Set to 1 if this is a fresh database (tables just created by schema.ts)
  if (currentVersion === 0) {
    db.execSync('PRAGMA user_version = 1;');
  }

  const pending = migrations.filter((m) => m.version > currentVersion);
  if (pending.length === 0) return;

  for (const migration of pending) {
    try {
      db.execSync('BEGIN TRANSACTION;');
      for (const stmt of migration.sql) {
        db.execSync(stmt);
      }
      db.execSync(`PRAGMA user_version = ${migration.version};`);
      db.execSync('COMMIT;');
    } catch (error) {
      db.execSync('ROLLBACK;');
      throw new Error(
        `Migration v${migration.version} (${migration.description}) failed: ${error}`
      );
    }
  }
};
