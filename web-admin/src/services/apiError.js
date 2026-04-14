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
  INTERNAL_ERROR: 'Hệ thống không thể xử lý yêu cầu. Vui lòng kiểm tra dữ liệu và thử lại.',
};

const STATUS_FALLBACK_MESSAGES = {
  0: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.',
  400: 'Yêu cầu không hợp lệ.',
  401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu.',
  409: 'Dữ liệu bị xung đột.',
  500: 'Hệ thống không thể xử lý yêu cầu. Vui lòng kiểm tra dữ liệu đã nhập và thử lại.',
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
  {
    pattern: /exercise.*(duplicate|duplicated|already used|already assigned|in more than one phase)|bài tập.*(trùng|đã chọn).*giai đoạn/i,
    message: 'Mỗi bài tập chỉ được chọn ở một giai đoạn. Vui lòng bỏ bài tập trùng.',
  },
  {
    pattern: /exercise ids?.*(duplicate|duplicated|must be unique)|duplicate exercise ids? across phases|mỗi bài tập chỉ được xuất hiện ở một giai đoạn/i,
    message: 'Một số bài tập đang bị chọn trùng giữa các giai đoạn. Vui lòng kiểm tra lại.',
  },
  {
    pattern: /phase.*order.*(duplicate|duplicated)|thứ tự giai đoạn.*trùng/i,
    message: 'Thứ tự giai đoạn đang bị trùng. Vui lòng nhập lại.',
  },
  {
    pattern: /roadmap order.*(duplicate|duplicated|already exists)|thứ tự lộ trình.*(đã tồn tại|trùng)/i,
    message: 'Thứ tự lộ trình đang bị trùng. Vui lòng chọn số thứ tự khác.',
  },
  {
    pattern: /phase.*(required|empty|blank)|giai đoạn.*(bắt buộc|không được để trống)/i,
    message: 'Vui lòng nhập đầy đủ thông tin cho từng giai đoạn trước khi lưu.',
  },
  {
    pattern: /phases?.*(must not be empty|is required|cannot be empty)|cần ít nhất.*giai đoạn|ít nhất 1 giai đoạn/i,
    message: 'Lộ trình phải có ít nhất 1 giai đoạn trước khi lưu.',
  },
  {
    pattern: /specialty id.*(required|missing)|chuyên ngành.*(bắt buộc|không được để trống)/i,
    message: 'Vui lòng chọn chuyên ngành cho lộ trình.',
  },
  {
    pattern: /roadmap name.*(required|missing|blank)|tên lộ trình.*(bắt buộc|không được để trống)/i,
    message: 'Vui lòng nhập tên lộ trình.',
  },
  {
    pattern: /invalid phase data|phase payload.*invalid|dữ liệu giai đoạn.*không hợp lệ/i,
    message: 'Một hoặc nhiều giai đoạn đang có dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  },
  { pattern: /already exists|đã tồn tại|trùng lặp/i, message: 'Dữ liệu đã tồn tại trong hệ thống.' },
  { pattern: /not found|không tìm thấy/i, message: 'Không tìm thấy dữ liệu.' },
  { pattern: /vai trò trainer|role trainer|must have role trainer/i, message: 'Chỉ có thể phân công cho người dùng có vai trò Huấn luyện viên.' },
  { pattern: /unsupported media format|không được hỗ trợ|không hỗ trợ/i, message: 'Định dạng dữ liệu không được hỗ trợ.' },
  { pattern: /image size exceeds 10mb|video size exceeds 100mb|vượt quá dung lượng/i, message: 'File vượt quá dung lượng cho phép.' },
  {
    pattern: /data too long for column|string or binary data would be truncated|value too long for type|too long for column/i,
    message: 'Một số trường đang vượt quá độ dài cho phép. Vui lòng rút gọn nội dung rồi thử lại.',
  },
  {
    pattern: /could not execute statement|constraintviolationexception|sqlstate/i,
    message: 'Không thể lưu dữ liệu do ràng buộc hệ thống. Vui lòng kiểm tra lại thông tin vừa nhập.',
  },
  {
    pattern: /an unexpected error occurred|internal server error/i,
    message: 'Không thể xử lý thao tác này. Vui lòng kiểm tra dữ liệu nhập và thử lại.',
  },
  { pattern: /trainer id is required|thiếu trainer id/i, message: 'Vui lòng chọn huấn luyện viên để thực hiện thao tác này.' },
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

const FIELD_LABELS = {
  breedName: 'Tên giống',
  origin: 'Nguồn gốc',
  description: 'Mô tả',
  operationalCapabilities: 'Khả năng tác chiến',
  diseaseName: 'Tên bệnh',
  symptomSummary: 'Triệu chứng',
  treatmentGuidelines: 'Điều trị',
  preventionMeasures: 'Phòng ngừa',
  medicationName: 'Tên thuốc',
  dosageInstructions: 'Liều dùng',
  administrationMethod: 'Phương pháp dùng',
  sideEffects: 'Tác dụng phụ',
  contraindications: 'Chống chỉ định',
  storageRequirements: 'Bảo quản',
  rationCode: 'Mã khẩu phần',
  rationName: 'Tên khẩu phần',
  specialNotes: 'Ghi chú đặc biệt',
  exerciseName: 'Tên bài tập',
  instructions: 'Hướng dẫn',
  requiredEquipment: 'Thiết bị cần thiết',
  safetyPrecautions: 'Lưu ý an toàn',
  methodName: 'Tên phương pháp',
  advantages: 'Ưu điểm',
  disadvantages: 'Nhược điểm',
  roadmapName: 'Tên lộ trình',
  phaseName: 'Tên giai đoạn',
  phaseObjectives: 'Mục tiêu giai đoạn',
  assessmentCriteria: 'Tiêu chí đánh giá',
  guideTitle: 'Tiêu đề',
  emergencyType: 'Loại tình huống',
  immediateSteps: 'Các bước xử lý ngay',
  requiredMaterials: 'Vật tư cần thiết',
  doNotActions: 'Không nên làm',
  whenToSeekVet: 'Khi nào cần bác sĩ thú y',
  dogName: 'Tên chó',
  color: 'Màu lông',
  microchipId: 'Microchip ID',
  notes: 'Ghi chú',
  title: 'Tiêu đề',
  body: 'Nội dung',
  summary: 'Tóm tắt',
  fullName: 'Họ tên',
  username: 'Tên đăng nhập',
  password: 'Mật khẩu',
  email: 'Email',
  phone: 'Số điện thoại',
  role: 'Vai trò',
  militaryRank: 'Quân hàm',
  unit: 'Đơn vị',
  adminResponse: 'Phản hồi quản trị viên',
  comments: 'Nhận xét',
  comment: 'Nhận xét',
};

const normalizeWhitespace = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const toSentenceCase = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

const resolveFieldLabel = (field) => {
  const cleaned = normalizeWhitespace(field);
  if (!cleaned) return '';
  if (FIELD_LABELS[cleaned]) return FIELD_LABELS[cleaned];
  const fieldWithoutPath = cleaned.split('.').pop();
  if (fieldWithoutPath && FIELD_LABELS[fieldWithoutPath]) return FIELD_LABELS[fieldWithoutPath];
  return toSentenceCase(fieldWithoutPath || cleaned);
};

const translateRawFieldMessage = (message, fieldLabel) => {
  const cleaned = normalizeWhitespace(message);
  if (!cleaned) return '';

  const mapped = mapMessageByPattern(cleaned);
  if (mapped) return mapped;

  const requiredRegex = /(must not be blank|must not be empty|must not be null|is required|không được để trống|là bắt buộc)/i;
  if (requiredRegex.test(cleaned)) {
    return fieldLabel ? `${fieldLabel} không được để trống.` : 'Vui lòng nhập đầy đủ thông tin bắt buộc.';
  }

  const maxMatch = cleaned.match(/(?:must not exceed|max(?:imum)?(?: length)?)[^0-9]*(\d+)/i);
  if (maxMatch) {
    return fieldLabel ? `${fieldLabel} tối đa ${maxMatch[1]} ký tự.` : `Giá trị tối đa ${maxMatch[1]} ký tự.`;
  }

  const rangeMatch = cleaned.match(/between\s+(\d+)\s+and\s+(\d+)/i);
  if (rangeMatch) {
    return fieldLabel ? `${fieldLabel} phải từ ${rangeMatch[1]} đến ${rangeMatch[2]} ký tự.` : `Giá trị phải từ ${rangeMatch[1]} đến ${rangeMatch[2]} ký tự.`;
  }

  const minMatch = cleaned.match(/greater than or equal to\s*([-\d.]+)/i);
  if (minMatch) {
    return fieldLabel ? `${fieldLabel} phải lớn hơn hoặc bằng ${minMatch[1]}.` : `Giá trị phải lớn hơn hoặc bằng ${minMatch[1]}.`;
  }

  const maxValueMatch = cleaned.match(/less than or equal to\s*([-\d.]+)/i);
  if (maxValueMatch) {
    return fieldLabel ? `${fieldLabel} phải nhỏ hơn hoặc bằng ${maxValueMatch[1]}.` : `Giá trị phải nhỏ hơn hoặc bằng ${maxValueMatch[1]}.`;
  }

  const invalidRegex = /(is invalid|invalid|không hợp lệ)/i;
  if (invalidRegex.test(cleaned)) {
    return fieldLabel ? `${fieldLabel} không hợp lệ.` : 'Dữ liệu nhập chưa hợp lệ.';
  }

  return cleaned;
};

const formatFieldErrorMessage = (fieldError) => {
  if (!fieldError || typeof fieldError !== 'object') return '';
  const fieldLabel = resolveFieldLabel(fieldError.field);
  const translated = translateRawFieldMessage(fieldError.message, fieldLabel);

  if (!translated) return '';
  if (!fieldLabel) return translated;

  const normalizedTranslated = normalizeWhitespace(translated).toLowerCase();
  const normalizedFieldLabel = normalizeWhitespace(fieldLabel).toLowerCase();
  if (normalizedTranslated.startsWith(normalizedFieldLabel)) return translated;
  return `${fieldLabel}: ${translated}`;
};

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
  const firstFieldError = formatFieldErrorMessage(fieldErrors[0]);
  if (firstFieldError) return firstFieldError;

  if (errorCode && ERROR_CODE_MESSAGES[errorCode]) return ERROR_CODE_MESSAGES[errorCode];

  const mappedByPattern = mapMessageByPattern(serverMessage);
  if (mappedByPattern) return mappedByPattern;

  const normalizedServerMessage = normalizeWhitespace(serverMessage);
  if (normalizedServerMessage && !looksLikeEnglishMessage(normalizedServerMessage)) return normalizedServerMessage;

  if (STATUS_FALLBACK_MESSAGES[status]) return STATUS_FALLBACK_MESSAGES[status];

  return 'Không thể xử lý thao tác này. Vui lòng kiểm tra dữ liệu và thử lại.';
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
      ? dedupe(normalized.fieldErrors.map((item) => formatFieldErrorMessage(item)))
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
