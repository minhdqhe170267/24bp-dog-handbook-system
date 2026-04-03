const STATUS_LABELS = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Từ chối',
  REVISION_REQUESTED: 'Yêu cầu chỉnh sửa',
  UNPUBLISHED: 'Đã gỡ xuất bản',
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  LOCKED: 'Đã khóa',
  RETIRED: 'Nghỉ hưu',
  DECEASED: 'Đã mất',
  TRANSFERRED: 'Chuyển đơn vị',
  SUBMITTED: 'Đã gửi',
  UNDER_REVIEW: 'Đang xem xét',
  ACCEPTED: 'Đã chấp nhận',
  IMPLEMENTING: 'Đang xử lý',
  REVIEWED: 'Đã xem',
  NEW: 'Mới',
  ENROLLED: 'Đã ghi danh',
  IN_PROGRESS: 'Đang huấn luyện',
  COMPLETED: 'Hoàn thành',
  SUSPENDED: 'Tạm dừng',
  WITHDRAWN: 'Đã rút',
  NOT_STARTED: 'Chưa bắt đầu',
  SKIPPED: 'Bỏ qua',
};

const CONTENT_TYPE_LABELS = {
  CONTENT: 'Bài viết',
  DOG_BREED: 'Giống chó',
  DOG_PROFILE: 'Hồ sơ chó',
  NUTRITION_STANDARD: 'Tiêu chuẩn dinh dưỡng',
  TRAINING_EXERCISE: 'Bài tập huấn luyện',
  TRAINING_ROADMAP: 'Lộ trình huấn luyện',
  TRAINING_METHOD: 'Phương pháp huấn luyện',
  DEVELOPMENT_STAGE: 'Giai đoạn phát triển',
  DISEASE: 'Bệnh',
  MEDICATION: 'Thuốc',
  FIRST_AID_GUIDE: 'Hướng dẫn sơ cứu',
  DOG_ASSIGNMENT: 'Phân công chó',
  SYSTEM_SETTING: 'Cài đặt hệ thống',
  BREED_INFO: 'Giống chó',
  TRAINING_GUIDE: 'Huấn luyện',
  HEALTH_INFO: 'Sức khỏe',
  NUTRITION_GUIDE: 'Dinh dưỡng',
  FIRST_AID: 'Sơ cứu',
};

const SUGGESTION_TYPE_LABELS = {
  NEW_CONTENT: 'Đề xuất nội dung mới',
  UPDATE_EXISTING: 'Cập nhật nội dung',
  ERROR_REPORT: 'Báo lỗi nội dung',
  GENERAL_FEEDBACK: 'Góp ý chung',
};

const ROLE_LABELS = {
  ADMIN: 'Admin',
  CONTENT_EDITOR: 'Biên tập nội dung',
  REVIEWER: 'Người duyệt',
  TRAINER: 'Huấn luyện viên',
};

const ASSIGNMENT_TYPE_LABELS = {
  PRIMARY: 'Chính',
  SECONDARY: 'Phụ',
  TEMPORARY: 'Tạm thời',
};

const ASSIGNMENT_SCOPE_LABELS = {
  FULL_TRAINING: 'Huấn luyện toàn phần',
  CARE_ONLY: 'Chăm sóc tạm',
};

const SEVERITY_LABELS = {
  LOW: 'Nhẹ',
  MILD: 'Nhẹ',
  MEDIUM: 'Trung bình',
  MODERATE: 'Trung bình',
  HIGH: 'Nặng',
  SEVERE: 'Nặng',
  CRITICAL: 'Nguy hiểm',
};

const LEVEL_LABELS = {
  BASIC: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
};

const ACTIVITY_LABELS = {
  LOW: 'Nhẹ',
  MEDIUM: 'Trung bình',
  HIGH: 'Nặng',
};

const SIZE_LABELS = {
  SMALL: 'Nhỏ',
  MEDIUM: 'Trung bình',
  LARGE: 'Lớn',
  GIANT: 'Khổng lồ',
};

const TRAINABILITY_LABELS = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  VERY_HIGH: 'Rất cao',
};

const GENDER_LABELS = {
  MALE: 'Đực',
  FEMALE: 'Cái',
};

const TARGET_ROLE_LABELS = {
  BORDER_PATROL: 'Tuần tra biên giới',
  PATROL: 'Tuần tra',
  EXPLOSIVE_DETECTION: 'Phát hiện chất nổ',
  NARCOTICS_DETECTION: 'Phát hiện ma túy',
  SEARCH_AND_RESCUE: 'Tìm kiếm cứu nạn',
  GUARD: 'Bảo vệ',
};

const normalizeEnumValue = (value) => String(value ?? '').trim().toUpperCase();

const mapEnum = (map, value) => {
  if (value === null || value === undefined || value === '') return '—';
  const normalized = normalizeEnumValue(value);
  return map[normalized] || value;
};

export const getBooleanLabel = (value, yesLabel = 'Có', noLabel = 'Không') =>
  Boolean(value) ? yesLabel : noLabel;

export const getStatusLabel = (value) => mapEnum(STATUS_LABELS, value);
export const getContentTypeLabel = (value) => mapEnum(CONTENT_TYPE_LABELS, value);
export const getSuggestionTypeLabel = (value) => mapEnum(SUGGESTION_TYPE_LABELS, value);
export const getRoleLabel = (value) => mapEnum(ROLE_LABELS, value);
export const getAssignmentTypeLabel = (value) => mapEnum(ASSIGNMENT_TYPE_LABELS, value);
export const getAssignmentScopeLabel = (value) => mapEnum(ASSIGNMENT_SCOPE_LABELS, value);
export const getSeverityLabel = (value) => mapEnum(SEVERITY_LABELS, value);
export const getLevelLabel = (value) => mapEnum(LEVEL_LABELS, value);
export const getActivityLabel = (value) => mapEnum(ACTIVITY_LABELS, value);
export const getSizeLabel = (value) => mapEnum(SIZE_LABELS, value);
export const getTrainabilityLabel = (value) => mapEnum(TRAINABILITY_LABELS, value);
export const getGenderLabelVi = (value) => mapEnum(GENDER_LABELS, value);
export const getTargetRoleLabel = (value) => mapEnum(TARGET_ROLE_LABELS, value);

export const formatDetailEnumValue = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';

  switch (key) {
    case 'status':
      return getStatusLabel(value);
    case 'contentType':
    case 'entityType':
      return getContentTypeLabel(value);
    case 'suggestionType':
      return getSuggestionTypeLabel(value);
    case 'role':
      return getRoleLabel(value);
    case 'assignmentType':
      return getAssignmentTypeLabel(value);
    case 'assignmentScope':
      return getAssignmentScopeLabel(value);
    case 'severityLevel':
      return getSeverityLabel(value);
    case 'difficultyLevel':
      return getLevelLabel(value);
    case 'activityLevel':
      return getActivityLabel(value);
    case 'sizeClassification':
      return getSizeLabel(value);
    case 'trainabilityLevel':
      return getTrainabilityLabel(value);
    case 'targetRole':
      return getTargetRoleLabel(value);
    case 'gender':
      return getGenderLabelVi(value);
    case 'isContagious':
      return getBooleanLabel(value, 'Có', 'Không');
    case 'isActive':
      return getBooleanLabel(value, 'Đang hiệu lực', 'Đã hủy');
    case 'isLocked':
      return getBooleanLabel(value, 'Đã khóa', 'Hoạt động');
    default:
      if (typeof value === 'boolean') return getBooleanLabel(value, 'Có', 'Không');
      return value;
  }
};
