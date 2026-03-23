const DEFAULT_TIME_KEYS = [
  'updatedAt',
  'updated_at',
  'lastModifiedAt',
  'lastModifiedDate',
  'modifiedAt',
  'modified_at',
  'createdAt',
  'created_at',
  'createdDate',
  'updatedDate',
  'timestamp',
];

const DEFAULT_ID_KEYS = [
  'id',
  'contentId',
  'breedId',
  'diseaseId',
  'medicationId',
  'standardId',
  'methodId',
  'exerciseId',
  'roadmapId',
  'guideId',
  'dogId',
  'assignmentId',
  'userId',
  'profileId',
];

const parseDateValue = (value) => {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) return 0;
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const parseIdValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortByNewest = (records, options = {}) => {
  if (!Array.isArray(records)) return [];
  if (records.length <= 1) return [...records];

  const timeKeys = Array.isArray(options.timeKeys) && options.timeKeys.length > 0
    ? options.timeKeys
    : DEFAULT_TIME_KEYS;
  const idKeys = Array.isArray(options.idKeys) && options.idKeys.length > 0
    ? options.idKeys
    : DEFAULT_ID_KEYS;

  const getTimeScore = (record) => {
    for (const key of timeKeys) {
      const score = parseDateValue(record?.[key]);
      if (score > 0) return score;
    }
    return 0;
  };

  const getIdScore = (record) => {
    for (const key of idKeys) {
      const score = parseIdValue(record?.[key]);
      if (score > 0) return score;
    }
    return 0;
  };

  return [...records].sort((left, right) => {
    const timeDiff = getTimeScore(right) - getTimeScore(left);
    if (timeDiff !== 0) return timeDiff;
    return getIdScore(right) - getIdScore(left);
  });
};

export default sortByNewest;
