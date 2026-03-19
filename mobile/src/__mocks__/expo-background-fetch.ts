export const BackgroundFetchResult = {
  NewData: 2,
  NoData: 1,
  Failed: 3,
};

export const BackgroundFetchStatus = {
  Restricted: 1,
  Denied: 2,
  Available: 3,
};

export const getStatusAsync = jest.fn().mockResolvedValue(3); // Available
export const registerTaskAsync = jest.fn().mockResolvedValue(undefined);
export const unregisterTaskAsync = jest.fn().mockResolvedValue(undefined);
