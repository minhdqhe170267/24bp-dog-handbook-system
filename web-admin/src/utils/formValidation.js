const isBlank = (value) => String(value ?? '').trim() === '';

const textLength = (value) => String(value ?? '').trim().length;

const parseNumber = (value) => {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
};

const addRequired = (errors, value, label) => {
  if (isBlank(value)) errors.push(`${label} không được để trống`);
};

const addMaxLength = (errors, value, max, label) => {
  if (textLength(value) > max) {
    errors.push(`${label} tối đa ${max} ký tự`);
  }
};

const addNumericRange = (errors, value, label, options) => {
  const number = parseNumber(value);
  if (number === null) return;
  if (Number.isNaN(number)) {
    errors.push(`${label} phải là số hợp lệ`);
    return;
  }
  if (options.integer && !Number.isInteger(number)) {
    errors.push(`${label} phải là số nguyên`);
    return;
  }
  if (options.min != null && number < options.min) {
    errors.push(`${label} phải lớn hơn hoặc bằng ${options.min}`);
    return;
  }
  if (options.max != null && number > options.max) {
    errors.push(`${label} phải nhỏ hơn hoặc bằng ${options.max}`);
  }
};

const addLifespanRange = (errors, value, label) => {
  if (isBlank(value)) return;
  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    errors.push(`${label} phải là số nguyên hợp lệ`);
    return;
  }

  const years = Number(normalized);
  if (!Number.isInteger(years)) {
    errors.push(`${label} phải là số nguyên hợp lệ`);
    return;
  }
  if (years < 1) {
    errors.push(`${label} phải lớn hơn hoặc bằng 1`);
    return;
  }
  if (years > 30) {
    errors.push(`${label} phải nhỏ hơn hoặc bằng 30`);
  }
};

const addEnumRequired = (errors, value, label) => {
  if (isBlank(value)) errors.push(`Vui lòng chọn ${label.toLowerCase()}`);
};

const VIETNAMESE_PHONE_REGEX = /^(\+84|0)[0-9]{9,10}$/;
const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_LONG_TEXT_MAX = 255;

export const validateBreedForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.breedName, 'Tên giống');
  addMaxLength(errors, form.breedName, 100, 'Tên giống');
  addMaxLength(errors, form.origin, 100, 'Nguồn gốc');
  addLifespanRange(errors, form.lifespanYears, 'Tuổi thọ');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addMaxLength(errors, form.operationalCapabilities, SAFE_LONG_TEXT_MAX, 'Khả năng tác chiến');
  return errors;
};

export const validateDiseaseForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.diseaseName, 'Tên bệnh');
  addMaxLength(errors, form.diseaseName, 200, 'Tên bệnh');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addMaxLength(errors, form.commonSymptoms, SAFE_LONG_TEXT_MAX, 'Triệu chứng');
  addMaxLength(errors, form.treatment, SAFE_LONG_TEXT_MAX, 'Điều trị');
  addMaxLength(errors, form.preventionMethods, SAFE_LONG_TEXT_MAX, 'Phòng ngừa');
  return errors;
};

export const validateMedicationForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.medicationName, 'Tên thuốc');
  addMaxLength(errors, form.medicationName, 200, 'Tên thuốc');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addMaxLength(errors, form.dosageInstructions, SAFE_LONG_TEXT_MAX, 'Liều dùng');
  addMaxLength(errors, form.administrationMethod, 200, 'Phương pháp dùng');
  addMaxLength(errors, form.sideEffects, SAFE_LONG_TEXT_MAX, 'Tác dụng phụ');
  addMaxLength(errors, form.contraindications, SAFE_LONG_TEXT_MAX, 'Chống chỉ định');
  addMaxLength(errors, form.storageRequirements, SAFE_LONG_TEXT_MAX, 'Bảo quản');
  return errors;
};

export const validateNutritionForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.rationCode, 'Mã khẩu phần');
  addRequired(errors, form.rationName, 'Tên khẩu phần');
  addEnumRequired(errors, form.activityLevel, 'mức hoạt động');
  addMaxLength(errors, form.rationCode, 50, 'Mã khẩu phần');
  addMaxLength(errors, form.rationName, 200, 'Tên khẩu phần');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addMaxLength(errors, form.specialNotes, SAFE_LONG_TEXT_MAX, 'Ghi chú đặc biệt');
  return errors;
};

export const validateExerciseForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.exerciseName, 'Tên bài tập');
  addEnumRequired(errors, form.difficultyLevel, 'độ khó');
  addRequired(errors, form.durationMinutes, 'Thời gian (phút)');
  addMaxLength(errors, form.exerciseName, 200, 'Tên bài tập');
  addNumericRange(errors, form.durationMinutes, 'Thời gian (phút)', { min: 1, max: 480, integer: true });
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addMaxLength(errors, form.instructions, SAFE_LONG_TEXT_MAX, 'Hướng dẫn');
  addMaxLength(errors, form.requiredEquipment, SAFE_LONG_TEXT_MAX, 'Thiết bị cần thiết');
  addMaxLength(errors, form.safetyPrecautions, SAFE_LONG_TEXT_MAX, 'Lưu ý an toàn');
  return errors;
};

export const validateMethodForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.methodName, 'Tên phương pháp');
  addMaxLength(errors, form.methodName, 200, 'Tên phương pháp');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addMaxLength(errors, form.instructions, SAFE_LONG_TEXT_MAX, 'Hướng dẫn');
  addMaxLength(errors, form.advantages, SAFE_LONG_TEXT_MAX, 'Ưu điểm');
  addMaxLength(errors, form.disadvantages, SAFE_LONG_TEXT_MAX, 'Nhược điểm');
  return errors;
};

export const validateSpecialtyForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.specialtyCode, 'Mã chuyên ngành');
  addRequired(errors, form.specialtyName, 'Tên chuyên ngành');
  addMaxLength(errors, form.specialtyCode, 50, 'Mã chuyên ngành');
  addMaxLength(errors, form.specialtyName, 150, 'Tên chuyên ngành');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  return errors;
};

export const validateRoadmapForm = (form = {}) => {
  const errors = [];
  const phases = Array.isArray(form.phases) ? form.phases : [];
  const phaseOrderTracker = new Map();
  const exercisePhaseTracker = new Map();

  addRequired(errors, form.roadmapName, 'Tên lộ trình');
  addRequired(errors, form.specialtyId, 'Chuyên ngành');
  addRequired(errors, form.roadmapOrder, 'Thứ tự lộ trình');
  addMaxLength(errors, form.roadmapName, 200, 'Tên lộ trình');
  addMaxLength(errors, form.targetRole, 100, 'Vai trò mục tiêu');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addNumericRange(errors, form.roadmapOrder, 'Thứ tự lộ trình', { min: 1, integer: true });
  addNumericRange(errors, form.totalDurationWeeks, 'Tổng thời gian (tuần)', { min: 1, max: 104, integer: true });

  if (phases.length === 0) {
    errors.push('Cần ít nhất 1 giai đoạn');
  }

  phases.forEach((phase, index) => {
    const phaseIndex = index + 1;
    addRequired(errors, phase.phaseName, `Tên giai đoạn #${phaseIndex}`);
    addRequired(errors, phase.phaseOrder, `Thứ tự giai đoạn #${phaseIndex}`);
    addMaxLength(errors, phase.phaseName, 100, `Tên giai đoạn #${phaseIndex}`);
    addNumericRange(errors, phase.phaseOrder, `Thứ tự giai đoạn #${phaseIndex}`, { min: 1, integer: true });
    addNumericRange(errors, phase.phaseDurationWeeks, `Thời gian giai đoạn #${phaseIndex} (tuần)`, { min: 1, max: 52, integer: true });
    addMaxLength(errors, phase.phaseObjectives, SAFE_LONG_TEXT_MAX, `Mục tiêu giai đoạn #${phaseIndex}`);
    addMaxLength(errors, phase.assessmentCriteria, SAFE_LONG_TEXT_MAX, `Tiêu chí đánh giá #${phaseIndex}`);

    const phaseOrder = parseNumber(phase.phaseOrder);
    if (phaseOrder != null && !Number.isNaN(phaseOrder)) {
      const existed = phaseOrderTracker.get(phaseOrder);
      if (existed != null) {
        errors.push(`Thứ tự giai đoạn bị trùng giữa giai đoạn #${existed} và #${phaseIndex}`);
      } else {
        phaseOrderTracker.set(phaseOrder, phaseIndex);
      }
    }

    const exerciseIds = Array.isArray(phase.exerciseIds) ? phase.exerciseIds : [];
    exerciseIds.forEach((exerciseIdRaw) => {
      const exerciseId = Number(exerciseIdRaw);
      if (!Number.isFinite(exerciseId)) return;
      const usedPhase = exercisePhaseTracker.get(exerciseId);
      if (usedPhase != null && usedPhase !== phaseIndex) {
        errors.push(`Một bài tập đang bị chọn trùng ở giai đoạn #${usedPhase} và #${phaseIndex}`);
      } else {
        exercisePhaseTracker.set(exerciseId, phaseIndex);
      }
    });
  });
  return errors;
};

export const validateFirstAidGuideForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.guideTitle, 'Tiêu đề');
  addRequired(errors, form.emergencyType, 'Loại tình huống');
  addRequired(errors, form.immediateSteps, 'Các bước xử lý ngay');
  addMaxLength(errors, form.guideTitle, 200, 'Tiêu đề');
  addMaxLength(errors, form.emergencyType, 100, 'Loại tình huống');
  addMaxLength(errors, form.description, SAFE_LONG_TEXT_MAX, 'Mô tả');
  addMaxLength(errors, form.immediateSteps, SAFE_LONG_TEXT_MAX, 'Các bước xử lý ngay');
  addMaxLength(errors, form.requiredMaterials, SAFE_LONG_TEXT_MAX, 'Vật tư cần thiết');
  addMaxLength(errors, form.doNotActions, SAFE_LONG_TEXT_MAX, 'Không nên làm');
  addMaxLength(errors, form.whenToSeekVet, SAFE_LONG_TEXT_MAX, 'Khi nào cần bác sĩ thú y');
  return errors;
};

export const validateDogForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.dogName, 'Tên chó');
  addEnumRequired(errors, form.breedId, 'giống chó');
  addMaxLength(errors, form.dogName, 100, 'Tên chó');

  if (!isBlank(form.dateOfBirth)) {
    const rawDate = String(form.dateOfBirth).trim();
    const parsedDate = new Date(`${rawDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      errors.push('Ngày sinh không hợp lệ');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate > today) {
        errors.push('Ngày sinh không được lớn hơn ngày hiện tại');
      }
    }
  }

  addNumericRange(errors, form.currentWeightKg, 'Cân nặng (kg)', { min: 0, max: 200 });
  addNumericRange(errors, form.heightCm, 'Chiều cao (cm)', { min: 0, max: 200 });
  addMaxLength(errors, form.color, 100, 'Màu lông');
  addMaxLength(errors, form.microchipId, 50, 'Microchip ID');
  addMaxLength(errors, form.notes, SAFE_LONG_TEXT_MAX, 'Ghi chú');
  return errors;
};

export const validateDogAssignmentForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.dogId, 'Chó');
  addRequired(errors, form.trainerId, 'Huấn luyện viên');
  addRequired(errors, form.startDate, 'Ngày bắt đầu');
  addMaxLength(errors, form.notes, SAFE_LONG_TEXT_MAX, 'Ghi chú');

  if (!isBlank(form.startDate) && !isBlank(form.endDate)) {
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate < startDate) {
      errors.push('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
    }
  }

  return errors;
};

export const validateUserForm = (form = {}, options = {}) => {
  const errors = [];
  const isEditMode = Boolean(options.isEditMode);

  addRequired(errors, form.username, 'Tên đăng nhập');
  addRequired(errors, form.fullName, 'Họ tên');
  addRequired(errors, form.role, 'Vai trò');
  if (!isEditMode) {
    addRequired(errors, form.phone, 'Số điện thoại');
  }
  addMaxLength(errors, form.fullName, 100, 'Họ tên');
  addMaxLength(errors, form.email, 150, 'Email');
  addMaxLength(errors, form.militaryRank, 50, 'Quân hàm');
  addMaxLength(errors, form.unit, 100, 'Đơn vị');

  const usernameLength = textLength(form.username);
  if (!isBlank(form.username) && (usernameLength < 3 || usernameLength > 50)) {
    errors.push('Tên đăng nhập phải từ 3 đến 50 ký tự');
  }

  const passwordLength = textLength(form.password);
  if (!isEditMode && isBlank(form.password)) {
    errors.push('Mật khẩu không được để trống');
  }
  if (!isBlank(form.password) && (passwordLength < 6 || passwordLength > 100)) {
    errors.push('Mật khẩu phải từ 6 đến 100 ký tự');
  }

  if (!isBlank(form.email) && !BASIC_EMAIL_REGEX.test(String(form.email).trim())) {
    errors.push('Email không đúng định dạng');
  }

  if (!isBlank(form.phone) && !VIETNAMESE_PHONE_REGEX.test(String(form.phone).trim())) {
    errors.push('Số điện thoại phải theo định dạng Việt Nam (+84 hoặc 0...)');
  }

  if (String(form.role || '').toUpperCase() === 'TRAINER' && !form.specialtyId) {
    errors.push('Huấn luyện viên phải được gán chuyên ngành');
  }

  return errors;
};

export const validateProfileForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.fullName, 'Họ tên');
  addMaxLength(errors, form.fullName, 100, 'Họ tên');
  addMaxLength(errors, form.email, 150, 'Email');
  addMaxLength(errors, form.phone, 12, 'Số điện thoại');
  addMaxLength(errors, form.militaryRank, 50, 'Quân hàm');
  addMaxLength(errors, form.unit, 100, 'Đơn vị');

  if (!isBlank(form.email) && !BASIC_EMAIL_REGEX.test(String(form.email).trim())) {
    errors.push('Email không đúng định dạng');
  }

  if (!isBlank(form.phone) && !VIETNAMESE_PHONE_REGEX.test(String(form.phone).trim())) {
    errors.push('Số điện thoại phải theo định dạng Việt Nam (+84 hoặc 0...)');
  }

  return errors;
};
