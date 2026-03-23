const toPayload = (response) => response?.data ?? response ?? {};

export const getPageRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

export const fetchAllPages = async (fetchPage, options = {}) => {
  const batchSize = Number(options.batchSize) > 0 ? Number(options.batchSize) : 200;
  const maxPages = Number(options.maxPages) > 0 ? Number(options.maxPages) : 300;

  const rows = [];
  let pageIndex = 0;
  let totalPages = 1;

  while (pageIndex < totalPages && pageIndex < maxPages) {
    const response = await fetchPage(pageIndex, batchSize);
    const payload = toPayload(response);
    const pageRows = getPageRows(payload);
    rows.push(...pageRows);

    if (Array.isArray(payload)) {
      if (pageRows.length < batchSize) break;
      totalPages = pageIndex + 2;
    } else if (Number.isFinite(payload?.totalPages)) {
      totalPages = payload.totalPages;
    } else if (Number.isFinite(payload?.totalElements)) {
      totalPages = Math.max(1, Math.ceil(payload.totalElements / batchSize));
    } else {
      totalPages = pageRows.length > 0 ? pageIndex + 2 : pageIndex + 1;
    }

    if (pageRows.length === 0) break;
    pageIndex += 1;
  }

  return rows;
};

export const paginateRows = (rows, page, pageSize) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 10;
  const safePage = Number(page) >= 0 ? Number(page) : 0;
  const totalItems = safeRows.length;
  const maxPage = totalItems > 0 ? Math.floor((totalItems - 1) / safePageSize) : 0;
  const effectivePage = Math.min(safePage, maxPage);
  const start = effectivePage * safePageSize;
  return {
    pageRows: safeRows.slice(start, start + safePageSize),
    totalItems,
    effectivePage,
  };
};

