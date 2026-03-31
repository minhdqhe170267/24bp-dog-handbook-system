const ERROR_CODE_MESSAGES = {
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.',
  USER_NOT_FOUND: 'Tài khoản không tồn tại.',
  USER_LOCKED: 'Tài khoản đã bị khóa.',
  USER_DISABLED: 'Tài khoản đã bị vô hiệu hóa.',
  WRONG_PASSWORD: 'Mật khẩu không đúng.',
  REQUEST_TIMEOUT: 'Yêu cầu quá thời gian phản hồi. Vui lòng thử lại.',
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.',
  ACCESS_DENIED: 'Bạn không có quyền thực hiện thao tác này.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',
  MISSING_PARAMETER: 'Thiếu tham số bắt buộc.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  ENDPOINT_NOT_FOUND: 'Không tìm thấy endpoint.',
  CONFLICT: 'Dữ liệu bị trùng lặp hoặc xung đột.',
  SYNC_CONFLICT: 'Dữ liệu bị xung đột, vui lòng tải lại.',
  CONTENT_PUBLISHED: 'Nội dung đã xuất bản, cần gỡ xuất bản trước khi chỉnh sửa.',
  FILE_REQUIRED: 'Bạn chưa chọn file.',
  FILE_INVALID: 'File không hợp lệ.',
  FILE_TOO_LARGE: 'File vượt quá dung lượng cho phép.',
  UNSUPPORTED_FORMAT: 'Định dạng file không được hỗ trợ.',
  IMPORT_ERROR: 'Import dữ liệu thất bại.',
  BAD_RESPONSE: 'Phản hồi từ máy chủ không hợp lệ.',
  BAD_REQUEST: 'Yêu cầu không hợp lệ.',
  INTERNAL_ERROR: 'Đã xảy ra lỗi hệ thống.',
};

const STATUS_FALLBACK_MESSAGES = {
  0: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  400: 'Yêu cầu không hợp lệ.',
  401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu.',
  409: 'Dữ liệu bị xung đột.',
  500: 'Hệ thống đang bận, vui lòng thử lại sau.',
  502: 'Phản hồi từ máy chủ không hợp lệ.',
};

const MESSAGE_PATTERNS = [
  { pattern: /bad credentials|sai mật khẩu|mật khẩu không đúng/i, message: 'Mật khẩu không đúng.' },
  { pattern: /user account is locked|account locked|tài khoản.*khóa/i, message: 'Tài khoản đã bị khóa.' },
  { pattern: /user is disabled|account disabled|tài khoản.*vô hiệu/i, message: 'Tài khoản đã bị vô hiệu hóa.' },
  { pattern: /full authentication is required|token expired|jwt expired|phiên đăng nhập đã hết hạn/i, message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' },
  { pattern: /access is denied|permission denied|forbidden/i, message: 'Bạn không có quyền thực hiện thao tác này.' },
  { pattern: /request timeout|timeout exceeded|ecconnaborted/i, message: 'Yêu cầu quá thời gian phản hồi. Vui lòng thử lại.' },
  { pattern: /network error|failed to fetch|load failed/i, message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.' },
  { pattern: /must be in draft or rejected|chỉ.*draft.*rejected|draft.*hoặc.*rejected/i, message: 'Chỉ có thể gửi duyệt khi trạng thái là Nháp hoặc Từ chối.' },
  { pattern: /must be in pending|chỉ.*pending|pending.*mới.*duyệt/i, message: 'Chỉ có thể duyệt hoặc từ chối khi trạng thái là Chờ duyệt.' },
  { pattern: /must be in approved|chỉ.*approved|approved.*mới.*xuất bản/i, message: 'Chỉ có thể xuất bản khi trạng thái là Đã duyệt.' },
  { pattern: /must be in published|chỉ.*published|published.*mới.*gỡ xuất bản/i, message: 'Chỉ có thể gỡ xuất bản khi trạng thái là Đã xuất bản.' },
  { pattern: /published content must be unpublished before update/i, message: 'Nội dung đã xuất bản, cần gỡ xuất bản trước khi chỉnh sửa.' },
  { pattern: /published content must be unpublished before delete/i, message: 'Nội dung đã xuất bản, cần gỡ xuất bản trước khi ẩn.' },
  { pattern: /nội dung đã xuất bản phải gỡ xuất bản trước khi sửa/i, message: 'Nội dung đã xuất bản, cần gỡ xuất bản trước khi chỉnh sửa.' },
  { pattern: /nội dung đã xuất bản phải gỡ xuất bản trước khi xóa/i, message: 'Nội dung đã xuất bản, cần gỡ xuất bản trước khi ẩn.' },
  { pattern: /giống chó.*đã tồn tại|đã tồn tại.*giống chó|breed.*already exists/i, message: 'Tên giống chó đã tồn tại. Vui lòng nhập tên khác.' },
  { pattern: /tên bệnh.*đã tồn tại|disease.*already exists/i, message: 'Tên bệnh đã tồn tại. Vui lòng nhập tên khác.' },
  { pattern: /tên thuốc.*đã tồn tại|medication.*already exists/i, message: 'Tên thuốc đã tồn tại. Vui lòng nhập tên khác.' },
  { pattern: /tên bài tập.*đã tồn tại|exercise.*already exists/i, message: 'Tên bài tập đã tồn tại. Vui lòng nhập tên khác.' },
  { pattern: /tên phương pháp.*đã tồn tại|method.*already exists/i, message: 'Tên phương pháp đã tồn tại. Vui lòng nhập tên khác.' },
  { pattern: /tên lộ trình.*đã tồn tại|roadmap.*already exists/i, message: 'Tên lộ trình đã tồn tại. Vui lòng nhập tên khác.' },
  { pattern: /mã khẩu phần.*đã tồn tại|ration code.*already exists/i, message: 'Mã khẩu phần đã tồn tại. Vui lòng nhập mã khác.' },
  { pattern: /microchip.*đã tồn tại|microchip.*already exists/i, message: 'Microchip ID đã tồn tại. Vui lòng kiểm tra lại.' },
  { pattern: /email.*đã tồn tại|email.*already exists/i, message: 'Email đã tồn tại trong hệ thống.' },
  { pattern: /username.*đã tồn tại|username.*already exists/i, message: 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.' },
  { pattern: /phone.*đã tồn tại|số điện thoại.*đã tồn tại|phone.*already exists/i, message: 'Số điện thoại đã tồn tại trong hệ thống.' },
  { pattern: /already exists|đã tồn tại|trùng lặp/i, message: 'Dữ liệu đã tồn tại trong hệ thống.' },
  { pattern: /not found|không tìm thấy/i, message: 'Không tìm thấy dữ liệu.' },
  { pattern: /vai trò trainer|role trainer|must have role trainer/i, message: 'Chỉ có thể phân công cho người dùng có vai trò Huấn luyện viên.' },
  { pattern: /unsupported media format|không được hỗ trợ|không hỗ trợ/i, message: 'Định dạng dữ liệu không được hỗ trợ.' },
  { pattern: /image size exceeds 10mb|video size exceeds 100mb|vượt quá dung lượng/i, message: 'File vượt quá dung lượng cho phép.' },
  { pattern: /trainer id is required|thiếu trainer id/i, message: 'Vui lòng nhập Trainer ID để thực hiện thao tác này.' },
  { pattern: /start date.*required|ngày bắt đầu.*bắt buộc|ngày bắt đầu.*không được để trống/i, message: 'Vui lòng chọn ngày bắt đầu.' },
  { pattern: /end date.*before start date|ngày kết thúc.*trước ngày bắt đầu/i, message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.' },
  { pattern: /is required|là bắt buộc|không được để trống/i, message: 'Vui lòng nhập đầy đủ thông tin bắt buộc.' },
  { pattern: /invalid|không hợp lệ/i, message: 'Dữ liệu nhập chưa hợp lệ.' },
  { pattern: /must be greater than|phải lớn hơn/i, message: 'Giá trị nhập chưa hợp lệ.' },
];

const TITLE_BY_ERROR_CODE = {
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ',
  USER_NOT_FOUND: 'Đăng nhập thất bại',
  USER_LOCKED: 'Tài khoản đã bị khóa',
  USER_DISABLED: 'Tài khoản đã bị vô hiệu hóa',
  WRONG_PASSWORD: 'Đăng nhập thất bại',
  REQUEST_TIMEOUT: 'Hết thời gian chờ',
  NETWORK_ERROR: 'Lỗi kết nối',
  ACCESS_DENIED: 'Không có quyền truy cập',
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ',
  MISSING_PARAMETER: 'Thiếu dữ liệu bắt buộc',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  ENDPOINT_NOT_FOUND: 'Không tìm thấy endpoint',
  CONFLICT: 'Dữ liệu bị xung đột',
  SYNC_CONFLICT: 'Xung đột đồng bộ dữ liệu',
  INTERNAL_ERROR: 'Lỗi hệ thống',
  IMPORT_ERROR: 'Import dữ liệu thất bại',
  BAD_RESPONSE: 'Phản hồi không hợp lệ',
  FILE_REQUIRED: 'Thiếu file đính kèm',
  FILE_INVALID: 'File không hợp lệ',
  FILE_TOO_LARGE: 'File quá dung lượng',
  UNSUPPORTED_FORMAT: 'Định dạng không hỗ trợ',
};

const TITLE_BY_STATUS = {
  0: 'Lỗi kết nối',
  400: 'Yêu cầu không hợp lệ',
  401: 'Phiên đăng nhập không hợp lệ',
  403: 'Không có quyền truy cập',
  404: 'Không tìm thấy dữ liệu',
  409: 'Dữ liệu bị xung đột',
  500: 'Lỗi hệ thống',
  502: 'Phản hồi không hợp lệ',
};

const normalizeWhitespace = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const extractFieldErrors = (errors) => {
  if (!Array.isArray(errors)) return [];
  return errors
    .map((item) => ({
      field: normalizeWhitespace(item?.field),
      message: normalizeWhitespace(item?.message),
    }))
    .filter((item) => item.message);
};

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const splitValidationMessages = (message) => {
  const cleaned = normalizeWhitespace(message);
  if (!cleaned) return [];
  if (!cleaned.includes(',')) return [cleaned];
  return dedupe(
    cleaned
      .split(',')
      .map((item) => normalizeWhitespace(item))
      .filter((item) => item.length > 1)
  );
};

const mapMessageByPattern = (message) => {
  const cleaned = normalizeWhitespace(message);
  if (!cleaned) return '';
  for (const item of MESSAGE_PATTERNS) {
    if (item.pattern.test(cleaned)) return item.message;
  }
  return '';
};

const hasVietnameseChar = (message) => /[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(message);
const hasAsciiLetters = (message) => /[a-z]/i.test(message);
const looksLikeEnglishMessage = (message) => hasAsciiLetters(message) && !hasVietnameseChar(message);

const getPayloadFromError = (errorLike) => {
  const requestCode = normalizeWhitespace(errorLike?.code);
  const requestMessage = normalizeWhitespace(errorLike?.message);

  if (errorLike?.response) {
    return {
      status: errorLike.response?.status || 0,
      payload: errorLike.response?.data || {},
      requestCode,
      requestMessage,
    };
  }

  return {
    status: errorLike?.status || 0,
    payload: errorLike || {},
    requestCode,
    requestMessage,
  };
};

const resolveMainMessage = ({ status, errorCode, serverMessage, fieldErrors }) => {
  const firstFieldError = fieldErrors[0]?.message || '';
  if (firstFieldError) return firstFieldError;

  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) return ERROR_CODE_MESSAGES[errorCode];

  const mappedByPattern = mapMessageByPattern(serverMessage);
  if (mappedByPattern) return mappedByPattern;

  const normalizedServerMessage = normalizeWhitespace(serverMessage);
  if (normalizedServerMessage && !looksLikeEnglishMessage(normalizedServerMessage)) return normalizedServerMessage;

  if (STATUS_FALLBACK_MESSAGES[status]) return STATUS_FALLBACK_MESSAGES[status];

  return 'Đã xảy ra lỗi không mong muốn.';
};

export const normalizeApiError = (errorLike) => {
  if (errorLike?.__normalizedApiError) return errorLike;

  const { status, payload, requestCode, requestMessage } = getPayloadFromError(errorLike);
  const payloadData =
    payload?.data && typeof payload.data === 'object'
      ? payload.data
      : null;
  const effectiveStatus = status || payload?.status || payloadData?.status || 0;
  const transportErrorCode =
    requestCode === 'ECONNABORTED'
      ? 'REQUEST_TIMEOUT'
      : !status && /network error|failed to fetch|load failed/i.test(requestMessage)
        ? 'NETWORK_ERROR'
        : null;
  const errorCode =
    normalizeWhitespace(payload?.errorCode || payloadData?.errorCode || transportErrorCode) || null;
  const serverMessage = normalizeWhitespace(
    payload?.message || payloadData?.message || requestMessage
  );
  const fieldErrors = extractFieldErrors(payload?.errors || payloadData?.errors);

  const validationMessages =
    fieldErrors.length > 0
      ? dedupe(fieldErrors.map((item) => item.message))
      : errorCode === 'VALIDATION_ERROR'
        ? splitValidationMessages(serverMessage)
        : [];

  const message = resolveMainMessage({
    status: effectiveStatus,
    errorCode,
    serverMessage,
    fieldErrors,
  });

  return {
    __normalizedApiError: true,
    success: false,
    status: effectiveStatus,
    errorCode,
    message,
    fieldErrors,
    validationMessages,
    raw: payload,
    data: payload?.data ?? null,
  };
};

export const buildApiErrorToast = (errorLike, fallbackTitle = 'Thao tác thất bại') => {
  const normalized = normalizeApiError(errorLike);
  const title =
    TITLE_BY_ERROR_CODE[normalized.errorCode] ||
    TITLE_BY_STATUS[normalized.status] ||
    fallbackTitle;

  const fieldErrorMessages =
    Array.isArray(normalized.fieldErrors) && normalized.fieldErrors.length > 0
      ? dedupe(
          normalized.fieldErrors.map((item) =>
            item.field ? `${item.field}: ${item.message}` : item.message
          )
        )
      : [];

  const description =
    fieldErrorMessages.length > 0
      ? fieldErrorMessages
      : normalized.validationMessages.length > 1
        ? normalized.validationMessages
        : normalized.message || fallbackTitle;

  const dedupeKey = [
    normalized.errorCode || `status-${normalized.status || 0}`,
    title,
    Array.isArray(description) ? description.join('|') : description,
  ].join('::');

  return {
    title,
    description,
    dedupeKey,
    normalizedError: normalized,
  };
};

export { ERROR_CODE_MESSAGES, STATUS_FALLBACK_MESSAGES };
