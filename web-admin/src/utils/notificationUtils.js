const ENTITY_ROUTE_MAP = {
  CONTENT: (entityId) => (entityId ? `/content/${entityId}` : '/content'),
  DOG_BREED: (entityId) => (entityId ? `/breeds/${entityId}/edit` : '/breeds'),
  DOG_PROFILE: (entityId) => (entityId ? `/dogs/${entityId}/edit` : '/dogs'),
  NUTRITION_STANDARD: (entityId) => (entityId ? `/nutrition/${entityId}/edit` : '/nutrition'),
  TRAINING_EXERCISE: (entityId) =>
    entityId ? `/training/exercises/${entityId}/edit` : '/training/exercises',
  TRAINING_ROADMAP: (entityId) =>
    entityId ? `/training/roadmaps/${entityId}/edit` : '/training/roadmaps',
  TRAINING_METHOD: (entityId) =>
    entityId ? `/training/methods/${entityId}/edit` : '/training/methods',
  DEVELOPMENT_STAGE: () => '/breeds',
  DISEASE: (entityId) => (entityId ? `/diseases/${entityId}/edit` : '/diseases'),
  MEDICATION: (entityId) => (entityId ? `/medications/${entityId}/edit` : '/medications'),
  FIRST_AID_GUIDE: (entityId) => (entityId ? `/medical/${entityId}/edit` : '/medical'),
  SUGGESTION: () => '/suggestions',
  CONTENT_SUGGESTION: () => '/suggestions',
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
  SUGGESTION: 'Đề xuất',
  CONTENT_SUGGESTION: 'Đề xuất',
};

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

export const resolveNotificationRoute = (notification) => {
  const entityType = String(notification?.entityType || '').toUpperCase();
  const entityId = Number(notification?.entityId) || null;
  const byEntity = ENTITY_ROUTE_MAP[entityType];
  if (byEntity) return byEntity(entityId);

  const type = String(notification?.type || '').toUpperCase();
  return TYPE_FALLBACK_ROUTE_MAP[type] || '/dashboard';
};

export const formatNotificationTime = (value) => {
  if (!value) return '--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  const now = new Date();
  const isToday =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  const timePart = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) return timePart;

  const datePart = date.toLocaleDateString('vi-VN');
  return `${timePart} ${datePart}`;
};
