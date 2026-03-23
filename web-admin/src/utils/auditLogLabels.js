import { getContentTypeLabel } from './enumLabels';

const AUDIT_ACTION_LABELS = {
  LOGIN: 'Đăng nhập',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  LOGOUT: 'Đăng xuất',
  CHANGE_PASSWORD: 'Đổi mật khẩu',
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
  APPROVE: 'Duyệt',
  REJECT: 'Từ chối',
  PUBLISH: 'Xuất bản',
  UNPUBLISH: 'Gỡ xuất bản',
  SUBMIT_FOR_REVIEW: 'Gửi duyệt',
  LOCK_USER: 'Khóa người dùng',
  UNLOCK_USER: 'Mở khóa người dùng',
  ACTIVATE_USER: 'Kích hoạt người dùng',
  DEACTIVATE_USER: 'Vô hiệu hóa người dùng',
  IMPORT_DATA: 'Import dữ liệu',
  EXPORT_DATA: 'Export dữ liệu',
  SYNC_PUSH: 'Đẩy đồng bộ',
  SYNC_PULL: 'Nhận đồng bộ',
};

const AUDIT_ENTITY_LABELS = {
  SYSTEM_SETTING: 'Cài đặt hệ thống',
  USER: 'Người dùng',
  MEDIA: 'Media',
  BREED: 'Giống chó',
  DOG: 'Hồ sơ chó',
  ASSIGNMENT: 'Phân công chó',
  DOG_ASSIGNMENT: 'Phân công chó',
  AUTH: 'Xác thực',
};

const normalizeUpper = (value) => String(value || '').trim().toUpperCase();

export const getAuditActionLabelVi = (value) => {
  const normalized = normalizeUpper(value);
  return AUDIT_ACTION_LABELS[normalized] || value || '—';
};

export const getAuditEntityLabelVi = (value) => {
  if (!value) return '—';
  const normalized = normalizeUpper(value);
  if (AUDIT_ENTITY_LABELS[normalized]) return AUDIT_ENTITY_LABELS[normalized];

  const mapped = getContentTypeLabel(normalized);
  if (mapped && mapped !== normalized) return mapped;
  return value;
};

const translateMethod = (value) => {
  const normalized = normalizeUpper(value);
  const map = {
    CREATE: 'tạo mới',
    UPDATE: 'cập nhật',
    DELETE: 'xóa',
    PATCH: 'chỉnh sửa',
    PUT: 'cập nhật',
    POST: 'tạo mới',
    GET: 'xem',
  };
  return map[normalized] || String(value || '').trim();
};

const translateLoginFailedDetail = (detail) => {
  const normalized = (detail || '').trim();
  if (!normalized) return 'Đăng nhập thất bại';

  const wrongPasswordMatch = normalized.match(/wrong password\s*\(attempt\s*(\d+)\s*,\s*(\d+)\s*remaining\)/i);
  if (wrongPasswordMatch) {
    const [, attempt, remaining] = wrongPasswordMatch;
    return `Đăng nhập thất bại: sai mật khẩu (lần ${attempt}, còn ${remaining} lần)`;
  }

  const replaced = normalized
    .replace(/wrong password/gi, 'sai mật khẩu')
    .replace(/account locked/gi, 'tài khoản đã bị khóa')
    .replace(/user not found/gi, 'không tìm thấy tài khoản')
    .replace(/invalid credentials/gi, 'thông tin đăng nhập không đúng')
    .replace(/attempt\s+(\d+)/gi, 'lần $1')
    .replace(/(\d+)\s+remaining/gi, 'còn $1 lần')
    .replace(/too many attempts/gi, 'quá số lần thử');

  return `Đăng nhập thất bại: ${replaced}`;
};

export const getAuditDescriptionVi = (description, context = {}) => {
  if (!description) return '—';
  const raw = String(description).trim();
  if (!raw) return '—';

  if (/^login successful$/i.test(raw)) {
    return 'Đăng nhập thành công';
  }

  const loginFailedMatch = raw.match(/^login failed:\s*(.+)$/i);
  if (loginFailedMatch) {
    return translateLoginFailedDetail(loginFailedMatch[1]);
  }

  if (/access denied|forbidden/i.test(raw)) {
    return 'Truy cập bị từ chối';
  }
  if (/unauthorized/i.test(raw)) {
    return 'Chưa xác thực truy cập';
  }

  const logPatternMatch = raw.match(/^([A-Z_]+)\s+([A-Z_]+)(?:\s+via\s+([A-Za-z_]+))?$/);
  if (logPatternMatch) {
    const [, actionRaw, entityRaw, methodRaw] = logPatternMatch;
    const actionLabel = getAuditActionLabelVi(actionRaw || context.actionType);
    const entityLabel = getAuditEntityLabelVi(entityRaw || context.entityType);
    if (methodRaw) {
      return `${actionLabel} ${entityLabel} (qua ${translateMethod(methodRaw)})`;
    }
    return `${actionLabel} ${entityLabel}`;
  }

  return raw;
};

