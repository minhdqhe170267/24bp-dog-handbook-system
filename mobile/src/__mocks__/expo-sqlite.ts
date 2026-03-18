const mockDb = {
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  withTransactionAsync: jest.fn(async (cb: () => Promise<void>) => cb()),
  execAsync: jest.fn().mockResolvedValue(undefined),
};

export const openDatabaseSync = jest.fn(() => mockDb);
