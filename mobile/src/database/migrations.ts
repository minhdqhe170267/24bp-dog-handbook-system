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
  {
    version: 2,
    description: 'Add trainerName, dogName, dogCode to dog_assignment',
    run: (db) => {
      addColumnIfMissing(db, 'dog_assignment', 'trainer_name', 'TEXT');
      addColumnIfMissing(db, 'dog_assignment', 'dog_name', 'TEXT');
      addColumnIfMissing(db, 'dog_assignment', 'dog_code', 'TEXT');
    },
  },
  {
    version: 3,
    description: 'Add password_hash to user_session for offline login',
    run: (db) => {
      addColumnIfMissing(db, 'user_session', 'password_hash', 'TEXT');
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
