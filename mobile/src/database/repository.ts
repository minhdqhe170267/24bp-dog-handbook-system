import { db } from './index';

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

  /** Batch upsert using INSERT OR REPLACE inside a transaction */
  batchUpsert: async (table: string, records: Record<string, any>[]): Promise<void> => {
    if (records.length === 0) return;
    await db.withTransactionAsync(async () => {
      for (const record of records) {
        const keys = Object.keys(record);
        const placeholders = keys.map(() => '?').join(', ');
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
          Object.values(record),
        );
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
