const toActionType = (row) => String(row?.actionType || row?.action_type || '').trim().toUpperCase();

const toTimestamp = (row) => {
  const raw = row?.actionTimestamp || row?.action_timestamp || row?.createdAt || null;
  const time = new Date(raw || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const toSortableId = (row) => {
  const parsed = Number(row?.logId ?? row?.id ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortAuditLogsCreateFirst = (rows = []) =>
  [...rows].sort((left, right) => {
    const leftIsCreate = toActionType(left) === 'CREATE';
    const rightIsCreate = toActionType(right) === 'CREATE';

    if (leftIsCreate !== rightIsCreate) {
      return leftIsCreate ? -1 : 1;
    }

    const timeDiff = toTimestamp(right) - toTimestamp(left);
    if (timeDiff !== 0) return timeDiff;

    return toSortableId(right) - toSortableId(left);
  });

