import { normalizeApiError } from '../../services/apiError';

const normalizeMessage = (value) => String(value || '').trim();

const contains = (message, pattern) => pattern.test(message);

const FALLBACK_TITLE_BY_ACTION = {
  create: 'Không thể tạo phân công',
  update: 'Không thể cập nhật phân công',
  save: 'Không thể lưu phân công',
  unassign: 'Không thể hủy phân công',
  fetch: 'Không thể tải dữ liệu phân công',
};

const resolveServerMessage = (normalized) =>
  normalizeMessage(
    normalized?.raw?.message ||
      normalized?.raw?.data?.message ||
      normalized?.message ||
      ''
  );

export const mapAssignmentErrorToToast = (error, action = 'save') => {
  const normalized = normalizeApiError(error);
  const serverMessage = resolveServerMessage(normalized);

  if (normalized?.status === 403 || normalized?.errorCode === 'ACCESS_DENIED') {
    return {
      title: 'Bạn không có quyền thao tác',
      description: 'Tài khoản hiện tại không có quyền thực hiện thao tác phân công chó.',
    };
  }

  if (
    normalized?.status === 404 ||
    contains(serverMessage, /không tìm thấy.*phân công|assignmentid/i)
  ) {
    return {
      title: 'Không tìm thấy phân công',
      description: 'Bản ghi phân công không còn tồn tại hoặc đã bị thay đổi.',
    };
  }

  if (contains(serverMessage, /ngày bắt đầu không được để trống/i)) {
    return {
      title: 'Thiếu ngày bắt đầu',
      description: 'Vui lòng chọn ngày bắt đầu cho phân công.',
    };
  }

  if (contains(serverMessage, /ngày kết thúc không được trước ngày bắt đầu/i)) {
    return {
      title: 'Khoảng thời gian không hợp lệ',
      description: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.',
    };
  }

  if (contains(serverMessage, /vai trò trainer|must have role trainer|role trainer/i)) {
    return {
      title: 'Sai vai trò người nhận phân công',
      description: 'Chỉ có thể phân công cho người dùng có vai trò Huấn luyện viên.',
    };
  }

  if (contains(serverMessage, /đã có phân công trùng thời gian/i)) {
    return {
      title: 'Trùng lịch phân công',
      description: 'Cặp chó và huấn luyện viên này đã có phân công trong cùng khoảng thời gian.',
    };
  }

  if (contains(serverMessage, /chó này đã có huấn luyện viên chính/i)) {
    return {
      title: 'Chó đã có phân công chính',
      description: 'Chó này đã có huấn luyện viên chính trong khoảng thời gian đã chọn.',
    };
  }

  if (contains(serverMessage, /huấn luyện viên này đã có chó phụ trách chính/i)) {
    return {
      title: 'Huấn luyện viên đã đủ phân công chính',
      description: 'Huấn luyện viên này đã phụ trách chính một chó khác trong khoảng thời gian đã chọn.',
    };
  }

  if (contains(serverMessage, /chó này đã có người chăm sóc tạm/i)) {
    return {
      title: 'Đã có phân công tạm thời',
      description: 'Chó này đã có người chăm sóc tạm trong khoảng thời gian đã chọn.',
    };
  }

  if (contains(serverMessage, /care_only.*phải gắn|phân công care_only phải gắn/i)) {
    return {
      title: 'Thiếu phân công chính liên kết',
      description:
        'Phân công tạm thời yêu cầu chó đang có một phân công chính hiệu lực trong cùng khoảng thời gian.',
    };
  }

  if (contains(serverMessage, /dữ liệu phân công primary.*chồng chéo/i)) {
    return {
      title: 'Dữ liệu phân công chính bị chồng chéo',
      description:
        'Chó đang có nhiều phân công chính chồng thời gian. Vui lòng kiểm tra lại dữ liệu phân công hiện có.',
    };
  }

  if (
    contains(serverMessage, /không thể đổi loại\/phạm vi.*care_only đang bao phủ/i) ||
    contains(serverMessage, /làm mất hiệu lực các phân công care_only/i)
  ) {
    return {
      title: 'Không thể cập nhật phân công chính',
      description:
        'Phân công chính này đang được các phân công tạm thời phụ thuộc, cần xử lý các phân công đó trước.',
    };
  }

  if (contains(serverMessage, /không hợp lệ.*primary|phạm vi phân công không hợp lệ|loại phân công không hợp lệ/i)) {
    return {
      title: 'Loại phân công không hợp lệ',
      description: 'Loại phân công hoặc phạm vi phân công không hợp lệ với dữ liệu hiện tại.',
    };
  }

  return {
    title: FALLBACK_TITLE_BY_ACTION[action] || FALLBACK_TITLE_BY_ACTION.save,
    description:
      normalizeMessage(normalized?.message) ||
      normalizeMessage(serverMessage) ||
      'Không thể xử lý phân công chó. Vui lòng thử lại.',
  };
};

