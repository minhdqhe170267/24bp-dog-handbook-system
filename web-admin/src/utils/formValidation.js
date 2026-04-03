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

const addEnumRequired = (errors, value, label) => {
  if (isBlank(value)) errors.push(`Vui lòng chọn ${label.toLowerCase()}`);
};

const VIETNAMESE_PHONE_REGEX = /^(\+84|0)[0-9]{9,10}$/;
const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateBreedForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.breedName, 'Tên giống');
  addMaxLength(errors, form.breedName, 100, 'Tên giống');
  addMaxLength(errors, form.origin, 100, 'Nguồn gốc');
  addMaxLength(errors, form.lifespanYears, 20, 'Tuổi thọ');
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addMaxLength(errors, form.operationalCapabilities, 5000, 'Khả năng tác chiến');
  return errors;
};

export const validateDiseaseForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.diseaseName, 'Tên bệnh');
  addMaxLength(errors, form.diseaseName, 200, 'Tên bệnh');
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addMaxLength(errors, form.commonSymptoms, 5000, 'Triệu chứng');
  addMaxLength(errors, form.treatment, 5000, 'Điều trị');
  addMaxLength(errors, form.preventionMethods, 5000, 'Phòng ngừa');
  return errors;
};

export const validateMedicationForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.medicationName, 'Tên thuốc');
  addMaxLength(errors, form.medicationName, 200, 'Tên thuốc');
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addMaxLength(errors, form.dosageInstructions, 5000, 'Liều dùng');
  addMaxLength(errors, form.administrationMethod, 200, 'Phương pháp dùng');
  addMaxLength(errors, form.sideEffects, 5000, 'Tác dụng phụ');
  addMaxLength(errors, form.contraindications, 5000, 'Chống chỉ định');
  addMaxLength(errors, form.storageRequirements, 5000, 'Bảo quản');
  return errors;
};

export const validateNutritionForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.rationCode, 'Mã khẩu phần');
  addRequired(errors, form.rationName, 'Tên khẩu phần');
  addEnumRequired(errors, form.activityLevel, 'mức hoạt động');
  addMaxLength(errors, form.rationCode, 50, 'Mã khẩu phần');
  addMaxLength(errors, form.rationName, 200, 'Tên khẩu phần');
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addMaxLength(errors, form.specialNotes, 5000, 'Ghi chú đặc biệt');
  return errors;
};

export const validateExerciseForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.exerciseName, 'Tên bài tập');
  addEnumRequired(errors, form.difficultyLevel, 'độ khó');
  addMaxLength(errors, form.exerciseName, 200, 'Tên bài tập');
  addNumericRange(errors, form.durationMinutes, 'Thời gian (phút)', { min: 1, max: 480, integer: true });
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addMaxLength(errors, form.instructions, 5000, 'Hướng dẫn');
  addMaxLength(errors, form.requiredEquipment, 500, 'Thiết bị cần thiết');
  addMaxLength(errors, form.safetyPrecautions, 5000, 'Lưu ý an toàn');
  return errors;
};

export const validateMethodForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.methodName, 'Tên phương pháp');
  addMaxLength(errors, form.methodName, 200, 'Tên phương pháp');
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addMaxLength(errors, form.instructions, 5000, 'Hướng dẫn');
  addMaxLength(errors, form.advantages, 5000, 'Ưu điểm');
  addMaxLength(errors, form.disadvantages, 5000, 'Nhược điểm');
  return errors;
};

export const validateRoadmapForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.roadmapName, 'Tên lộ trình');
  addMaxLength(errors, form.roadmapName, 200, 'Tên lộ trình');
  addMaxLength(errors, form.targetRole, 100, 'Vai trò mục tiêu');
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addNumericRange(errors, form.totalDurationWeeks, 'Tổng thời gian (tuần)', { min: 1, max: 104, integer: true });

  const phases = Array.isArray(form.phases) && form.phases.length > 0
    ? form.phases
    : [{
        phaseName: form.phaseName,
        phaseOrder: form.phaseOrder,
        phaseDurationWeeks: form.phaseDurationWeeks,
        phaseObjectives: form.phaseObjectives,
        assessmentCriteria: form.assessmentCriteria,
        exerciseIds: form.exerciseIds,
      }];

  if (!Array.isArray(phases) || phases.length === 0) {
    errors.push('Lộ trình phải có ít nhất 1 giai đoạn');
    return errors;
  }

  const phaseOrderSet = new Set();
  const exerciseIdSet = new Set();

  phases.forEach((phase, phaseIndex) => {
    const phasePrefix = `Giai đoạn ${phaseIndex + 1}`;
    addRequired(errors, phase?.phaseName, `${phasePrefix} - Tên giai đoạn`);
    addRequired(errors, phase?.phaseOrder, `${phasePrefix} - Thứ tự giai đoạn`);
    addMaxLength(errors, phase?.phaseName, 100, `${phasePrefix} - Tên giai đoạn`);
    addNumericRange(errors, phase?.phaseOrder, `${phasePrefix} - Thứ tự giai đoạn`, { min: 1, integer: true });
    addNumericRange(errors, phase?.phaseDurationWeeks, `${phasePrefix} - Thời gian giai đoạn (tuần)`, { min: 1, max: 52, integer: true });
    addMaxLength(errors, phase?.phaseObjectives, 5000, `${phasePrefix} - Mục tiêu giai đoạn`);
    addMaxLength(errors, phase?.assessmentCriteria, 5000, `${phasePrefix} - Tiêu chí đánh giá`);

    const phaseOrderNumber = Number(phase?.phaseOrder);
    if (Number.isFinite(phaseOrderNumber) && phaseOrderNumber > 0) {
      if (phaseOrderSet.has(phaseOrderNumber)) {
        errors.push(`Thứ tự giai đoạn bị trùng: ${phaseOrderNumber}`);
      } else {
        phaseOrderSet.add(phaseOrderNumber);
      }
    }

    const exerciseIds = Array.isArray(phase?.exerciseIds) ? phase.exerciseIds : [];
    exerciseIds.forEach((exerciseId) => {
      const normalizedExerciseId = Number(exerciseId);
      if (!Number.isFinite(normalizedExerciseId) || normalizedExerciseId <= 0) {
        errors.push(`${phasePrefix} - Bài tập không hợp lệ`);
        return;
      }
      if (exerciseIdSet.has(normalizedExerciseId)) {
        errors.push(`Mỗi bài tập chỉ được xuất hiện 1 lần trong toàn bộ lộ trình (ID: ${normalizedExerciseId})`);
      } else {
        exerciseIdSet.add(normalizedExerciseId);
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
  addMaxLength(errors, form.description, 5000, 'Mô tả');
  addMaxLength(errors, form.immediateSteps, 5000, 'Các bước xử lý ngay');
  addMaxLength(errors, form.requiredMaterials, 5000, 'Vật tư cần thiết');
  addMaxLength(errors, form.doNotActions, 5000, 'Không nên làm');
  addMaxLength(errors, form.whenToSeekVet, 5000, 'Khi nào cần bác sĩ thú y');
  return errors;
};

export const validateDogForm = (form = {}, options = {}) => {
  const errors = [];
  addRequired(errors, form.dogName, 'Tên chó');
  addEnumRequired(errors, form.breedId, 'giống chó');
  addMaxLength(errors, form.dogName, 100, 'Tên chó');

  const requireAgeMonths = options.requireAgeMonths !== false;
  if (requireAgeMonths && (form.ageMonths === '' || form.ageMonths == null)) {
    errors.push('Tuổi (tháng) không được để trống');
  } else {
    addNumericRange(errors, form.ageMonths, 'Tuổi (tháng)', { min: 0, max: 240, integer: true });
  }

  addNumericRange(errors, form.currentWeightKg, 'Cân nặng (kg)', { min: 0, max: 200 });
  addNumericRange(errors, form.heightCm, 'Chiều cao (cm)', { min: 0, max: 200 });
  addMaxLength(errors, form.color, 100, 'Màu lông');
  addMaxLength(errors, form.microchipId, 50, 'Microchip ID');
  addMaxLength(errors, form.notes, 5000, 'Ghi chú');
  return errors;
};

export const validateDogAssignmentForm = (form = {}) => {
  const errors = [];
  addRequired(errors, form.dogId, 'Chó');
  addRequired(errors, form.trainerId, 'Huấn luyện viên');
  addRequired(errors, form.startDate, 'Ngày bắt đầu');
  addMaxLength(errors, form.notes, 500, 'Ghi chú');

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
