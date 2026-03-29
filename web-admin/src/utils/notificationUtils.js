const DETAIL_ENTITY_ROUTE_MAP = {
  CONTENT: '/content',
  DOG_BREED: '/breeds',
  DOG_PROFILE: '/dogs',
  NUTRITION_STANDARD: '/nutrition',
  TRAINING_EXERCISE: '/training/exercises',
  TRAINING_ROADMAP: '/training/roadmaps',
  TRAINING_METHOD: '/training/methods',
  DEVELOPMENT_STAGE: '/breeds',
  DISEASE: '/diseases',
  MEDICATION: '/medications',
  FIRST_AID_GUIDE: '/medical',
  DOG_ASSIGNMENT: '/assignments',
  USER: '/system/users',
  SUGGESTION: '/suggestions',
  CONTENT_SUGGESTION: '/suggestions',
};

const TYPE_FALLBACK_ROUTE_MAP = {
  CONTENT_SUBMITTED: '/approval',
  CONTENT_APPROVED: '/content',
  CONTENT_REJECTED: '/content',
  CONTENT_REVISION_REQUESTED: '/content',
  CONTENT_PUBLISHED: '/content',
  CONTENT_UNPUBLISHED: '/content',
  SUGGESTION_SUBMITTED: '/suggestions',
  SUGGESTION_REVIEWED: '/suggestions',
};

const TYPE_LABEL_MAP = {
  CONTENT_SUBMITTED: 'Gửi duyệt',
  CONTENT_APPROVED: 'Đã duyệt',
  CONTENT_REJECTED: 'Từ chối',
  CONTENT_REVISION_REQUESTED: 'Yêu cầu chỉnh sửa',
  CONTENT_PUBLISHED: 'Xuất bản',
  CONTENT_UNPUBLISHED: 'Gỡ xuất bản',
  SUGGESTION_SUBMITTED: 'Đề xuất mới',
  SUGGESTION_REVIEWED: 'Đã phản hồi',
};

const ENTITY_LABEL_MAP = {
  CONTENT: 'Nội dung',
  DOG_BREED: 'Giống chó',
  DOG_PROFILE: 'Hồ sơ chó',
  NUTRITION_STANDARD: 'Dinh dưỡng',
  TRAINING_EXERCISE: 'Bài tập',
  TRAINING_ROADMAP: 'Lộ trình',
  TRAINING_METHOD: 'Phương pháp',
  DEVELOPMENT_STAGE: 'Giai đoạn',
  DISEASE: 'Bệnh',
  MEDICATION: 'Thuốc',
  FIRST_AID_GUIDE: 'Sơ cứu',
  DOG_ASSIGNMENT: 'Phân công chó',
  USER: 'Người dùng',
  SUGGESTION: 'Đề xuất',
  CONTENT_SUGGESTION: 'Đề xuất',
};

const REVIEW_APPROVAL_ENTITY_TYPES = new Set([
  'CONTENT',
  'DOG_BREED',
  'NUTRITION_STANDARD',
  'TRAINING_EXERCISE',
  'TRAINING_ROADMAP',
  'TRAINING_METHOD',
  'DEVELOPMENT_STAGE',
  'DISEASE',
  'MEDICATION',
  'FIRST_AID_GUIDE',
]);

const APPROVAL_REVIEW_NOTIFICATION_TYPES = new Set([
  'CONTENT_APPROVED',
  'CONTENT_REJECTED',
  'CONTENT_REVISION_REQUESTED',
]);

const toLabel = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');

export const getNotificationTypeLabel = (type) => TYPE_LABEL_MAP[type] || toLabel(type);

export const getNotificationEntityLabel = (entityType) =>
  ENTITY_LABEL_MAP[entityType] || toLabel(entityType) || 'Hệ thống';

const buildDetailRoute = (entityType, entityId, returnContext) => {
  if (!entityId) return null;
  const base = `/details/${entityType}/${entityId}`;
  if (!returnContext?.returnTo) return base;
  const query = new URLSearchParams();
  query.set('returnTo', returnContext.returnTo);
  if (returnContext.returnLabel) query.set('returnLabel', returnContext.returnLabel);
  return `${base}?${query.toString()}`;
};

const resolveReturnContext = ({ entityType, type, role }) => {
  const normalizedRole = String(role || '').trim().toUpperCase();
  if (normalizedRole === 'REVIEWER' && REVIEW_APPROVAL_ENTITY_TYPES.has(entityType)) {
    return { returnTo: '/approval', returnLabel: 'Duyệt nội dung' };
  }

  const fallbackRoute = DETAIL_ENTITY_ROUTE_MAP[entityType] || TYPE_FALLBACK_ROUTE_MAP[type] || null;
  if (!fallbackRoute) return null;

  if (fallbackRoute === '/approval') {
    return { returnTo: '/approval', returnLabel: 'Duyệt nội dung' };
  }

  return {
    returnTo: fallbackRoute,
    returnLabel: ENTITY_LABEL_MAP[entityType] || 'Danh sách',
  };
};

export const resolveNotificationRoute = (notification, options = {}) => {
  const entityType = String(notification?.entityType || '').toUpperCase();
  const entityId = Number(notification?.entityId) || null;
  const type = String(notification?.type || '').toUpperCase();
  const returnContext = resolveReturnContext({
    entityType,
    type,
    role: options?.role,
  });

  if (DETAIL_ENTITY_ROUTE_MAP[entityType]) {
    const detailRoute = buildDetailRoute(entityType, entityId, returnContext);
    if (detailRoute) return detailRoute;
    if (returnContext?.returnTo) return returnContext.returnTo;
    return DETAIL_ENTITY_ROUTE_MAP[entityType];
  }

  if (entityType && entityId) {
    const detailRoute = buildDetailRoute(entityType, entityId, returnContext);
    if (detailRoute) return detailRoute;
    return `/details/${entityType}/${entityId}`;
  }

  return TYPE_FALLBACK_ROUTE_MAP[type] || '/dashboard';
};

export const getNotificationFeedbackMeta = (notification) => {
  const type = String(notification?.type || '').trim().toUpperCase();
  const entityType = String(notification?.entityType || '').trim().toUpperCase();
  const entityId = Number(notification?.entityId);

  if (!Number.isFinite(entityId) || entityId <= 0) return null;

  if (APPROVAL_REVIEW_NOTIFICATION_TYPES.has(type)) {
    if (!entityType) return null;
    return {
      key: `APPROVAL:${entityType}:${entityId}`,
      source: 'approval',
      entityType,
      entityId,
    };
  }

  if (type === 'SUGGESTION_REVIEWED') {
    return {
      key: `SUGGESTION:${entityId}`,
      source: 'suggestion',
      entityType,
      entityId,
    };
  }

  return null;
};

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RECENT_WINDOW_MS = 4 * HOUR_MS;

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const startOfDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const isNotificationToday = (value) => {
  const date = toDate(value);
  if (!date) return false;
  const todayStart = startOfDay(new Date());
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const timestamp = date.getTime();
  return timestamp >= todayStart.getTime() && timestamp < tomorrowStart.getTime();
};

export const isNotificationRecent = (value) => {
  const date = toDate(value);
  if (!date) return false;
  const now = Date.now();
  const diffMs = now - date.getTime();
  return diffMs >= 0 && diffMs < RECENT_WINDOW_MS;
};

export const groupNotificationsByRecency = (notifications = []) => {
  const grouped = { recent: [], today: [], previous: [] };
  for (const item of notifications) {
    const createdAt = item?.createdAt;
    if (isNotificationRecent(createdAt)) {
      grouped.recent.push(item);
      continue;
    }
    if (isNotificationToday(createdAt)) {
      grouped.today.push(item);
      continue;
    }
    grouped.previous.push(item);
  }
  return grouped;
};

export const formatNotificationTime = (value) => {
  const date = toDate(value);
  if (!date) return '--';

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());

  if (diffMs < MINUTE_MS) return 'Vừa xong';

  if (diffMs < HOUR_MS) {
    const minutes = Math.max(1, Math.floor(diffMs / MINUTE_MS));
    return `${minutes} phút`;
  }

  if (diffMs < RECENT_WINDOW_MS || isNotificationToday(date)) {
    const hours = Math.max(1, Math.floor(diffMs / HOUR_MS));
    return `${hours} giờ`;
  }

  const todayStart = startOfDay(now);
  const dateStart = startOfDay(date);
  const dayDiff = Math.max(1, Math.floor((todayStart.getTime() - dateStart.getTime()) / DAY_MS));

  if (dayDiff < 7) return `${dayDiff} ngày`;

  const weekDiff = Math.max(1, Math.floor(dayDiff / 7));
  return `${weekDiff} tuần`;
};
