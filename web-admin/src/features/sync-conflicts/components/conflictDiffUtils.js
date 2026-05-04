const SYSTEM_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  'createdat',
  'updatedat',
  'local_id',
  'sync_status',
  'server_id',
  '_sync_version',
  'syncversion',
  // IDs and derived name fields (not meaningful to compare)
  'recordid',
  'dogid',
  'examinerid',
  'dogname',
  'dogcode',
  'examinername',
  'trainerid',
  'trainername',
  'localid',
  'localupdatedat',
  'serverid',
  'isdeleted',
  'deletedat',
  // Date/time fields managed by system (not meaningful to manually resolve)
  'examinationdate',
  'examination_date',
  // Nested object fields (displayed separately)
  'dogprofile',
  'examiner',
  'dogbreed',
  'createdby',
  'trainer',
]);

const FIELD_LABELS = {
  dog_code: 'Mã chó',
  dog_name: 'Tên chó',
  procedure_type: 'Loại thủ tục',
  procedure_date: 'Ngày thực hiện',
  notes: 'Ghi chú',
  vet_name: 'Bác sĩ thú y',
  status: 'Trạng thái',
  title: 'Tiêu đề',
  content: 'Nội dung',
  location: 'Vị trí',
  severity: 'Mức độ',
  temperature: 'Nhiệt độ',
  weight: 'Cân nặng',
  description: 'Mô tả',
  training_date: 'Ngày huấn luyện',
  updated_by: 'Người cập nhật',
};

const ENTITY_FIELD_LABELS = {
  HEALTH_RECORD: {
    diagnosis: 'Chẩn đoán',
    weight_kg: 'Cân nặng (kg)',
    weightkg: 'Cân nặng (kg)',
    temperature_c: 'Thân nhiệt (°C)',
    temperaturec: 'Thân nhiệt (°C)',
    feces_status: 'Tình trạng phân',
    fecesstatus: 'Tình trạng phân',
    appetite_level: 'Mức ăn',
    appetitelevel: 'Mức ăn',
    activity_level: 'Mức hoạt động',
    activitylevel: 'Mức hoạt động',
    observed_symptoms: 'Triệu chứng quan sát',
    observedsymptoms: 'Triệu chứng quan sát',
    treatment_given: 'Điều trị đã thực hiện',
    treatmentgiven: 'Điều trị đã thực hiện',
    next_checkup_date: 'Lịch khám tiếp',
    nextcheckupdate: 'Lịch khám tiếp',
    examination_date: 'Ngày khám',
    examinationdate: 'Ngày khám',
    notes: 'Ghi chú',
  },
  FIELD_NOTE: {
    location: 'Vị trí',
    note_text: 'Ghi chú thực địa',
    note_type: 'Loại ghi chú',
  },
  CONTENT_SUGGESTION: {
    title: 'Tiêu đề đề xuất',
    description: 'Nội dung đề xuất',
    suggestion_type: 'Loại đề xuất',
  },
};

const normalizeFieldKey = (value) =>
  String(value || '')
    .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
    .replace(/__+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const normalizeEntityType = (value) => String(value || '').trim().toUpperCase();

const toHumanLabel = (fieldKey) => {
  const normalized = normalizeFieldKey(fieldKey);
  return normalized
    .split('_')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const resolveFieldLabel = (entityType, fieldKey) => {
  const normalizedEntityType = normalizeEntityType(entityType);
  const normalizedField = normalizeFieldKey(fieldKey);
  const byEntity = ENTITY_FIELD_LABELS[normalizedEntityType]?.[normalizedField];
  if (byEntity) return byEntity;
  if (FIELD_LABELS[normalizedField]) return FIELD_LABELS[normalizedField];
  return toHumanLabel(fieldKey);
};

const isSystemField = (fieldKey) => {
  const normalized = normalizeFieldKey(fieldKey).replace(/_/g, '');
  return SYSTEM_FIELDS.has(normalizeFieldKey(fieldKey)) || SYSTEM_FIELDS.has(normalized);
};

const ENUM_TRANSLATIONS = {
  // appetiteLevel
  appetitelevel: {
    NORMAL: 'Bình thường',
    INCREASED: 'Tăng',
    DECREASED: 'Giảm',
    NONE: 'Không ăn',
  },
  appetite_level: {
    NORMAL: 'Bình thường',
    INCREASED: 'Tăng',
    DECREASED: 'Giảm',
    NONE: 'Không ăn',
  },
  // activityLevel
  activitylevel: {
    NORMAL: 'Bình thường',
    LOW: 'Thấp',
    VERY_LOW: 'Rất thấp',
    HYPERACTIVE: 'Hiếu động',
  },
  activity_level: {
    NORMAL: 'Bình thường',
    LOW: 'Thấp',
    VERY_LOW: 'Rất thấp',
    HYPERACTIVE: 'Hiếu động',
  },
  // fecesStatus
  fecesstatus: {
    NORMAL: 'Bình thường',
    BLOOD_PRESENT: 'Có máu',
    ABNORMAL: 'Bất thường',
    NOT_CHECKED: 'Chưa kiểm tra',
  },
  feces_status: {
    NORMAL: 'Bình thường',
    BLOOD_PRESENT: 'Có máu',
    ABNORMAL: 'Bất thường',
    NOT_CHECKED: 'Chưa kiểm tra',
  },
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('vi-VN');
};

const formatValue = (value, fieldKey) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';

  const normalizedField = normalizeFieldKey(fieldKey);

  // Enum translation
  const enumMap = ENUM_TRANSLATIONS[normalizedField];
  if (enumMap && typeof value === 'string' && enumMap[value]) {
    return enumMap[value];
  }

  const shouldTryDate =
    /(_date|_at|date|time)$/.test(normalizedField) || normalizedField.includes('timestamp');

  if (shouldTryDate) {
    const dateValue = formatDateTime(value);
    if (dateValue) return dateValue;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

const getAllFieldKeys = (localData, serverData, mergedData) =>
  Array.from(
    new Set([
      ...Object.keys(localData || {}),
      ...Object.keys(serverData || {}),
      ...Object.keys(mergedData || {}),
    ])
  ).filter((key) => !isSystemField(key));

export { formatValue, getAllFieldKeys, normalizeFieldKey, resolveFieldLabel };
