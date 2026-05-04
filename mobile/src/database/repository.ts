import { db } from './index';

// Cache PK column per table to avoid repeated PRAGMA calls
const pkColumnCache = new Map<string, string>();

const getPkColumn = (table: string): string => {
  if (pkColumnCache.has(table)) return pkColumnCache.get(table)!;
  const info = db.getAllSync<{ name: string; pk: number }>(`PRAGMA table_info(${table})`);
  const pk = info.find((c) => c.pk === 1)?.name ?? 'id';
  pkColumnCache.set(table, pk);
  return pk;
};

// ──────────────────────────────────────────────────────────────
// UUID helper (no external dependency)
// ──────────────────────────────────────────────────────────────

export const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

// ──────────────────────────────────────────────────────────────
// Generic CRUD helpers for SQLite
// ──────────────────────────────────────────────────────────────

export const repository = {
  /** Get all records from a table */
  getAll: <T>(table: string, orderBy?: string): Promise<T[]> =>
    db.getAllAsync<T>(`SELECT * FROM ${table}${orderBy ? ` ORDER BY ${orderBy}` : ''}`),

  /** Get all records matching a WHERE clause */
  getAllWhere: <T>(table: string, where: string, params: any[], orderBy?: string): Promise<T[]> =>
    db.getAllAsync<T>(
      `SELECT * FROM ${table} WHERE ${where}${orderBy ? ` ORDER BY ${orderBy}` : ''}`,
      params,
    ),

  /** Get a single record by id */
  getById: <T>(table: string, id: string | number, idColumn = 'id'): Promise<T | null> =>
    db.getFirstAsync<T>(`SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id]),

  /** Full-text search across multiple columns */
  search: <T>(table: string, columns: string[], keyword: string, orderBy?: string): Promise<T[]> => {
    const where = columns.map((c) => `${c} LIKE ?`).join(' OR ');
    const params = columns.map(() => `%${keyword}%`);
    return db.getAllAsync<T>(
      `SELECT * FROM ${table} WHERE (${where})${orderBy ? ` ORDER BY ${orderBy}` : ''}`,
      params,
    );
  },

  /** Insert a record, returns lastInsertRowId */
  insert: async (table: string, data: Record<string, any>): Promise<number> => {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const result = await db.runAsync(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
      Object.values(data),
    );
    return result.lastInsertRowId;
  },

  /**
   * Batch upsert using INSERT ... ON CONFLICT DO UPDATE SET.
   *
   * Unlike INSERT OR REPLACE (which does DELETE + INSERT and zeros out
   * columns not in the record), this only updates the columns present in
   * the incoming record — preserving any existing data in other columns.
   * This is safe for partial delta records sent by the server.
   */
  batchUpsert: async (table: string, records: Record<string, any>[]): Promise<void> => {
    if (records.length === 0) return;
    const pkCol = getPkColumn(table);
    await db.withTransactionAsync(async () => {
      for (const record of records) {
        const keys = Object.keys(record);
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(record);
        const nonPkKeys = keys.filter((k) => k !== pkCol);

        if (nonPkKeys.length > 0) {
          const updateClause = nonPkKeys.map((k) => `${k} = excluded.${k}`).join(', ');
          await db.runAsync(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})
             ON CONFLICT(${pkCol}) DO UPDATE SET ${updateClause}`,
            values,
          );
        } else {
          // Record only contains the PK — just ensure the row exists
          await db.runAsync(
            `INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
            values,
          );
        }
      }
    });
  },

  /** Update a record by id */
  update: async (
    table: string,
    id: string | number,
    data: Record<string, any>,
    idColumn = 'id',
  ): Promise<void> => {
    const keys = Object.keys(data);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    await db.runAsync(
      `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = ?`,
      [...Object.values(data), id],
    );
  },

  /** Soft-delete a record (set is_deleted = 1) */
  softDelete: async (table: string, id: string | number, idColumn = 'id'): Promise<void> => {
    await db.runAsync(
      `UPDATE ${table} SET is_deleted = 1, deleted_at = ? WHERE ${idColumn} = ?`,
      [new Date().toISOString(), id],
    );
  },

  /** Hard-delete a record */
  hardDelete: async (table: string, id: string | number, idColumn = 'id'): Promise<void> => {
    await db.runAsync(`DELETE FROM ${table} WHERE ${idColumn} = ?`, [id]);
  },

  /** Count records (with optional WHERE) */
  count: async (table: string, where?: string, params?: any[]): Promise<number> => {
    const sql = `SELECT COUNT(*) as cnt FROM ${table}${where ? ` WHERE ${where}` : ''}`;
    const row = await db.getFirstAsync<{ cnt: number }>(sql, params ?? []);
    return row?.cnt ?? 0;
  },

  /** Raw query (escape hatch) */
  raw: <T>(sql: string, params?: any[]): Promise<T[]> =>
    db.getAllAsync<T>(sql, params ?? []),

  /** Get max updated_at for delta sync */
  getLastUpdated: async (table: string): Promise<string | null> => {
    const row = await db.getFirstAsync<{ max_val: string | null }>(
      `SELECT MAX(updated_at) as max_val FROM ${table}`,
    );
    return row?.max_val ?? null;
  },
};
