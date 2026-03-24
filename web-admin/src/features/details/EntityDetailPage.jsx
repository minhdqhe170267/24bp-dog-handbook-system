import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Globe, Loader2, MessageSquare, Pencil, RotateCcw, XCircle } from 'lucide-react';
import CreateFormPage from '../../components/shared/CreateFormPage';
import PageHeader from '../../components/shared/PageHeader';
import EntityMediaPreview from '../../components/shared/EntityMediaPreview';
import { Button, FormField, FormInput, FormTextarea, Modal } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import {
  formatDetailEnumValue,
  getAssignmentTypeLabel,
  getContentTypeLabel,
  getRoleLabel,
  getStatusLabel,
} from '../../utils/enumLabels';

const formatDateValue = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('vi-VN');
};

const formatDateTimeValue = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
};

const APPROVAL_DECISION_LABELS = {
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  REVISION_REQUESTED: 'Yêu cầu chỉnh sửa',
  PENDING: 'Chờ xử lý',
};

const getApprovalDecisionLabel = (decision) =>
  APPROVAL_DECISION_LABELS[String(decision || '').trim().toUpperCase()] || toText(decision);

const toText = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

const normalizeReturnPath = (value) => {
  const raw = String(value || '').trim();
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  return raw;
};

const normalizeStatusValue = (value) => String(value || '').trim().toUpperCase();

const isDraftStatus = (value) => normalizeStatusValue(value) === 'DRAFT';

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

const ENTITY_CONFIG = {
  CONTENT: {
    label: 'Nội dung',
    endpoint: '/contents',
    listPath: '/content',
    mediaEntityType: APPROVAL_ENTITY_TYPES.CONTENT,
    idKey: 'contentId',
    fields: [
      { key: 'title', label: 'Tiêu đề' },
      { key: 'contentType', label: 'Loại nội dung', render: (value) => getContentTypeLabel(value) },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'authorName', label: 'Tác giả' },
      { key: 'summary', label: 'Tóm tắt', textarea: true },
      { key: 'body', label: 'Nội dung chính', textarea: true },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  DOG_BREED: {
    label: 'Giống chó',
    endpoint: '/breeds',
    listPath: '/breeds',
    getEditPath: (entityId) => `/breeds/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.DOG_BREED,
    idKey: 'breedId',
    fields: [
      { key: 'breedName', label: 'Tên giống' },
      { key: 'origin', label: 'Nguồn gốc' },
      { key: 'sizeClassification', label: 'Kích thước', render: (value) => formatDetailEnumValue('sizeClassification', value) },
      { key: 'trainabilityLevel', label: 'Khả năng huấn luyện', render: (value) => formatDetailEnumValue('trainabilityLevel', value) },
      { key: 'lifespanYears', label: 'Tuổi thọ' },
      { key: 'description', label: 'Mô tả', textarea: true },
      { key: 'operationalCapabilities', label: 'Khả năng tác chiến', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  DOG_PROFILE: {
    label: 'Hồ sơ chó',
    endpoint: '/dogs',
    listPath: '/dogs',
    mediaEntityType: APPROVAL_ENTITY_TYPES.DOG_PROFILE,
    idKey: 'dogId',
    fields: [
      { key: 'dogCode', label: 'Mã chó' },
      { key: 'dogName', label: 'Tên chó' },
      { key: 'breedName', label: 'Giống chó' },
      { key: 'gender', label: 'Giới tính', render: (value) => formatDetailEnumValue('gender', value) },
      { key: 'dateOfBirth', label: 'Ngày sinh', render: (value) => formatDateValue(value) },
      { key: 'currentWeightKg', label: 'Cân nặng', render: (value) => (value == null ? '—' : `${value} kg`) },
      { key: 'heightCm', label: 'Chiều cao', render: (value) => (value == null ? '—' : `${value} cm`) },
      { key: 'color', label: 'Màu lông' },
      { key: 'microchipId', label: 'Microchip ID' },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'notes', label: 'Ghi chú', textarea: true },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  NUTRITION_STANDARD: {
    label: 'Dinh dưỡng',
    endpoint: '/nutrition-standards',
    listPath: '/nutrition',
    getEditPath: (entityId) => `/nutrition/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD,
    idKey: 'standardId',
    fields: [
      { key: 'rationCode', label: 'Mã khẩu phần' },
      { key: 'rationName', label: 'Tên khẩu phần' },
      { key: 'breedName', label: 'Giống chó' },
      { key: 'activityLevel', label: 'Mức hoạt động', render: (value) => formatDetailEnumValue('activityLevel', value) },
      { key: 'targetAgeMinMonths', label: 'Tuổi tối thiểu (tháng)' },
      { key: 'targetAgeMaxMonths', label: 'Tuổi tối đa (tháng)' },
      { key: 'healthCondition', label: 'Tình trạng sức khỏe' },
      { key: 'description', label: 'Mô tả', textarea: true },
      { key: 'specialNotes', label: 'Ghi chú đặc biệt', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  TRAINING_EXERCISE: {
    label: 'Bài tập huấn luyện',
    endpoint: '/exercises',
    listPath: '/training/exercises',
    getEditPath: (entityId) => `/training/exercises/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.TRAINING_EXERCISE,
    idKey: 'exerciseId',
    fields: [
      { key: 'exerciseName', label: 'Tên bài tập' },
      { key: 'difficultyLevel', label: 'Độ khó', render: (value) => formatDetailEnumValue('difficultyLevel', value) },
      { key: 'durationMinutes', label: 'Thời gian (phút)' },
      { key: 'methodName', label: 'Phương pháp' },
      { key: 'requiredEquipment', label: 'Thiết bị cần thiết' },
      { key: 'description', label: 'Mô tả', textarea: true },
      { key: 'instructions', label: 'Hướng dẫn', textarea: true },
      { key: 'safetyPrecautions', label: 'Lưu ý an toàn', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  TRAINING_ROADMAP: {
    label: 'Lộ trình huấn luyện',
    endpoint: '/roadmaps',
    listPath: '/training/roadmaps',
    getEditPath: (entityId) => `/training/roadmaps/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP,
    idKey: 'roadmapId',
    fields: [
      { key: 'roadmapName', label: 'Tên lộ trình' },
      { key: 'breedName', label: 'Giống chó' },
      { key: 'targetRole', label: 'Vai trò mục tiêu', render: (value) => formatDetailEnumValue('targetRole', value) },
      { key: 'totalDurationWeeks', label: 'Tổng thời gian (tuần)' },
      { key: 'phaseName', label: 'Tên giai đoạn' },
      { key: 'phaseOrder', label: 'Thứ tự giai đoạn' },
      { key: 'phaseDurationWeeks', label: 'Thời gian giai đoạn (tuần)' },
      { key: 'phaseObjectives', label: 'Mục tiêu giai đoạn', textarea: true },
      { key: 'assessmentCriteria', label: 'Tiêu chí đánh giá', textarea: true },
      { key: 'description', label: 'Mô tả', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  TRAINING_METHOD: {
    label: 'Phương pháp huấn luyện',
    endpoint: '/training-methods',
    listPath: '/training/methods',
    getEditPath: (entityId) => `/training/methods/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.TRAINING_METHOD,
    idKey: 'methodId',
    fields: [
      { key: 'methodName', label: 'Tên phương pháp' },
      { key: 'description', label: 'Mô tả', textarea: true },
      { key: 'instructions', label: 'Hướng dẫn', textarea: true },
      { key: 'advantages', label: 'Ưu điểm', textarea: true },
      { key: 'disadvantages', label: 'Nhược điểm', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  DISEASE: {
    label: 'Bệnh',
    endpoint: '/diseases',
    listPath: '/diseases',
    getEditPath: (entityId) => `/diseases/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.DISEASE,
    idKey: 'diseaseId',
    fields: [
      { key: 'diseaseName', label: 'Tên bệnh' },
      { key: 'severityLevel', label: 'Mức độ', render: (value) => formatDetailEnumValue('severityLevel', value) },
      { key: 'isContagious', label: 'Lây nhiễm', render: (value) => formatDetailEnumValue('isContagious', value) },
      { key: 'symptoms', label: 'Triệu chứng', textarea: true },
      { key: 'treatment', label: 'Điều trị', textarea: true },
      { key: 'preventionMethods', label: 'Phòng ngừa', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  MEDICATION: {
    label: 'Thuốc',
    endpoint: '/medications',
    listPath: '/medications',
    getEditPath: (entityId) => `/medications/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.MEDICATION,
    idKey: 'medicationId',
    fields: [
      { key: 'medicationName', label: 'Tên thuốc' },
      { key: 'activeIngredient', label: 'Hoạt chất' },
      { key: 'dosage', label: 'Liều lượng' },
      { key: 'administrationMethod', label: 'Phương pháp dùng' },
      { key: 'usageInstructions', label: 'Hướng dẫn sử dụng', textarea: true },
      { key: 'sideEffects', label: 'Tác dụng phụ', textarea: true },
      { key: 'contraindications', label: 'Chống chỉ định', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  FIRST_AID_GUIDE: {
    label: 'Sơ cứu',
    endpoint: '/first-aid-guides',
    listPath: '/medical',
    getEditPath: (entityId) => `/medical/${entityId}/edit`,
    mediaEntityType: APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE,
    idKey: 'guideId',
    fields: [
      { key: 'guideTitle', label: 'Tiêu đề' },
      { key: 'emergencyType', label: 'Loại tình huống' },
      { key: 'description', label: 'Mô tả', textarea: true },
      { key: 'immediateSteps', label: 'Xử lý ngay', textarea: true },
      { key: 'requiredMaterials', label: 'Vật tư cần thiết', textarea: true },
      { key: 'doNotActions', label: 'Không nên làm', textarea: true },
      { key: 'whenToSeekVet', label: 'Khi nào cần thú y', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'createdByName', label: 'Người tạo' },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  DOG_ASSIGNMENT: {
    label: 'Phân công chó',
    endpoint: '/assignments',
    listPath: '/assignments',
    idKey: 'assignmentId',
    fields: [
      { key: 'assignmentId', label: 'Mã phân công' },
      { key: 'dogCode', label: 'Mã chó' },
      { key: 'dogName', label: 'Tên chó' },
      { key: 'trainerName', label: 'Huấn luyện viên' },
      { key: 'trainerUsername', label: 'Tên đăng nhập HLV' },
      { key: 'assignmentType', label: 'Loại phân công', render: (value) => getAssignmentTypeLabel(value) },
      { key: 'startDate', label: 'Ngày bắt đầu', render: (value) => formatDateValue(value) },
      { key: 'endDate', label: 'Ngày kết thúc', render: (value) => formatDateValue(value) },
      { key: 'isActive', label: 'Trạng thái', render: (value) => formatDetailEnumValue('isActive', value) },
      { key: 'notes', label: 'Ghi chú', textarea: true },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  USER: {
    label: 'Người dùng',
    endpoint: '/users',
    listPath: '/system/users',
    idKey: 'userId',
    fields: [
      { key: 'userId', label: 'ID' },
      { key: 'username', label: 'Tên đăng nhập' },
      { key: 'fullName', label: 'Họ tên' },
      { key: 'role', label: 'Vai trò', render: (value) => getRoleLabel(value) },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Số điện thoại' },
      { key: 'militaryRank', label: 'Quân hàm' },
      { key: 'unit', label: 'Đơn vị' },
      { key: 'isLocked', label: 'Trạng thái khóa', render: (value) => formatDetailEnumValue('isLocked', value) },
      { key: 'failedLoginCount', label: 'Số lần đăng nhập sai' },
      { key: 'lastLoginAt', label: 'Đăng nhập gần nhất', render: (value) => formatDateTimeValue(value) },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
  SUGGESTION: {
    label: 'Nội dung đề xuất',
    endpoint: '/suggestions',
    listPath: '/suggestions',
    idKey: 'suggestionId',
    fields: [
      { key: 'title', label: 'Tiêu đề' },
      { key: 'description', label: 'Nội dung', textarea: true },
      { key: 'status', label: 'Trạng thái', render: (value) => getStatusLabel(value) },
      { key: 'submittedByName', label: 'Người gửi' },
      { key: 'adminResponse', label: 'Phản hồi', textarea: true },
      { key: 'updatedAt', label: 'Cập nhật', render: (value) => formatDateTimeValue(value) },
      { key: 'createdAt', label: 'Ngày tạo', render: (value) => formatDateTimeValue(value) },
    ],
  },
};

const ENTITY_ALIASES = {
  ASSIGNMENT: 'DOG_ASSIGNMENT',
  DOG_ASSIGNMENT: 'DOG_ASSIGNMENT',
  USER: 'USER',
  SUGGESTION: 'SUGGESTION',
  CONTENT_SUGGESTION: 'SUGGESTION',
};

const normalizeEntityType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (ENTITY_CONFIG[normalized]) return normalized;
  if (ENTITY_ALIASES[normalized]) return ENTITY_ALIASES[normalized];
  return normalized;
};

const EntityDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user } = useAuth();
  const { entityType: routeEntityType, id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [suggestionResponseOpen, setSuggestionResponseOpen] = useState(false);
  const [suggestionResponse, setSuggestionResponse] = useState('');
  const [suggestionResponding, setSuggestionResponding] = useState(false);
  const [reviewerFeedbackLoading, setReviewerFeedbackLoading] = useState(false);
  const [latestReviewerFeedback, setLatestReviewerFeedback] = useState(null);

  const entityType = normalizeEntityType(routeEntityType);
  const config = ENTITY_CONFIG[entityType];
  const role = useMemo(() => String(user?.role || '').trim().toUpperCase(), [user?.role]);
  const isReviewer = role === 'REVIEWER';
  const isEditor = role === 'CONTENT_EDITOR';
  const isAdmin = role === 'ADMIN';
  const isWorkflowEntity = REVIEW_APPROVAL_ENTITY_TYPES.has(entityType);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const explicitBackPath =
    normalizeReturnPath(location.state?.returnTo) || normalizeReturnPath(searchParams.get('returnTo'));
  const explicitBackLabel = String(location.state?.returnLabel || searchParams.get('returnLabel') || '');
  const isApprovalContext = explicitBackPath === '/approval';
  const fallbackBackPath = isReviewer && isWorkflowEntity ? '/approval' : config?.listPath || '/dashboard';
  const fallbackBackLabel = isReviewer && isWorkflowEntity ? 'Duyệt nội dung' : config?.label || 'Danh sách';
  const backPath =
    explicitBackPath ||
    fallbackBackPath;
  const backLabel = explicitBackLabel || fallbackBackLabel;

  const fetchDetail = useCallback(async () => {
    if (!config || !id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`${config.endpoint}/${id}`);
      const detail = res?.data || res || {};
      setData(detail);
    } catch (error) {
      setData(null);
      toast.error(error, { title: `Không tải được chi tiết ${config.label.toLowerCase()}` });
    } finally {
      setLoading(false);
    }
  }, [config, id, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const resolvedEntityId = useMemo(() => {
    if (!config) return null;
    const rawId = data?.[config.idKey] ?? id;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : rawId;
  }, [config, data, id]);

  useEffect(() => {
    let active = true;
    const fetchLatestFeedback = async () => {
      if (!isWorkflowEntity || !resolvedEntityId) {
        if (active) setLatestReviewerFeedback(null);
        return;
      }

      setReviewerFeedbackLoading(true);
      try {
        const res = await approvalService.getHistory(entityType, resolvedEntityId);
        const payload = res?.data || res || [];
        const records = Array.isArray(payload) ? payload : payload.content || [];
        const latest = records[0];
        if (active) {
          setLatestReviewerFeedback(latest && String(latest?.comments || '').trim() ? latest : null);
        }
      } catch (error) {
        if (active) setLatestReviewerFeedback(null);
      } finally {
        if (active) setReviewerFeedbackLoading(false);
      }
    };

    fetchLatestFeedback();
    return () => {
      active = false;
    };
  }, [entityType, isWorkflowEntity, resolvedEntityId]);

  const breadcrumbs = useMemo(() => {
    if (!config) return [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Chi tiết' }];
    return [
      { label: 'Dashboard', href: '/dashboard' },
      { label: backLabel, href: backPath },
      { label: 'Chi tiết' },
    ];
  }, [backLabel, backPath, config]);

  const resolveFieldValue = (field) => {
    const rawValue = field?.key ? data?.[field.key] : null;
    const resolved = field.render ? field.render(rawValue, data) : rawValue;
    return toText(resolved);
  };

  const workflowStatus = normalizeStatusValue(data?.status);
  const canRoleEdit = isAdmin || isEditor;
  const canReviewFromDetail =
    isWorkflowEntity && (isReviewer || (isAdmin && isApprovalContext));
  const canManageWorkflowFromDetail =
    isWorkflowEntity && (isEditor || isAdmin) && !isApprovalContext;
  const canRespondSuggestion =
    isAdmin &&
    entityType === 'SUGGESTION' &&
    ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(workflowStatus);

  const editPath = useMemo(() => {
    if (!config?.getEditPath) return null;
    if (resolvedEntityId === null || resolvedEntityId === undefined || resolvedEntityId === '') return null;
    if (canManageWorkflowFromDetail) {
      if (!['DRAFT', 'REJECTED'].includes(workflowStatus)) return null;
      return config.getEditPath(resolvedEntityId);
    }
    if (!canRoleEdit) return null;
    if (!isDraftStatus(data?.status)) return null;
    return config.getEditPath(resolvedEntityId);
  }, [canManageWorkflowFromDetail, canRoleEdit, config, data?.status, resolvedEntityId, workflowStatus]);

  const executeAction = useCallback(
    async ({ action, title, successMessage, comment = '' }) => {
      if (resolvedEntityId === null || resolvedEntityId === undefined || resolvedEntityId === '') return;
      if (!isWorkflowEntity) return;

      setActionLoading(true);
      try {
        if (action === 'APPROVE') {
          await approvalService.review(entityType, resolvedEntityId, 'APPROVED', comment);
        } else if (action === 'REJECT') {
          await approvalService.review(entityType, resolvedEntityId, 'REJECTED', comment);
        } else if (action === 'PUBLISH') {
          await approvalService.publish(entityType, resolvedEntityId);
        } else if (action === 'UNPUBLISH') {
          await approvalService.unpublish(entityType, resolvedEntityId);
        } else {
          return;
        }
        toast.success(successMessage);
        await fetchDetail();
      } catch (error) {
        toast.error(error, { title });
      } finally {
        setActionLoading(false);
      }
    },
    [entityType, fetchDetail, isWorkflowEntity, resolvedEntityId, toast]
  );

  const handleApprove = () =>
    executeAction({
      action: 'APPROVE',
      title: 'Không thể duyệt nội dung',
      successMessage: 'Duyệt thành công',
    });

  const handlePublish = () =>
    executeAction({
      action: 'PUBLISH',
      title: 'Không thể xuất bản',
      successMessage: 'Đã xuất bản thành công',
    });

  const handleUnpublish = () =>
    executeAction({
      action: 'UNPUBLISH',
      title: 'Không thể gỡ xuất bản',
      successMessage: 'Đã gỡ xuất bản thành công',
    });

  const handleReject = () => {
    if (actionLoading) return;
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    if (actionLoading) return;
    setRejectModalOpen(false);
    setRejectComment('');
  };

  const submitReject = async () => {
    const comment = rejectComment.trim();
    if (!comment) {
      toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    await executeAction({
      action: 'REJECT',
      title: 'Không thể từ chối nội dung',
      successMessage: 'Đã từ chối nội dung',
      comment,
    });
    setRejectModalOpen(false);
    setRejectComment('');
  };

  const openSuggestionResponseModal = () => {
    if (suggestionResponding) return;
    setSuggestionResponseOpen(true);
    setSuggestionResponse('');
  };

  const closeSuggestionResponseModal = () => {
    if (suggestionResponding) return;
    setSuggestionResponseOpen(false);
    setSuggestionResponse('');
  };

  const submitSuggestionResponse = async (nextStatus) => {
    const comment = suggestionResponse.trim();
    if (!comment) {
      toast.warning('Vui lòng nhập phản hồi trước khi gửi');
      return;
    }
    if (resolvedEntityId === null || resolvedEntityId === undefined || resolvedEntityId === '') return;

    setSuggestionResponding(true);
    try {
      await api.put(`/suggestions/${resolvedEntityId}/respond`, {
        adminResponse: comment,
        status: nextStatus,
      });
      toast.success(nextStatus === 'ACCEPTED' ? 'Đã chấp nhận đề xuất' : 'Đã từ chối đề xuất');
      setSuggestionResponseOpen(false);
      setSuggestionResponse('');
      await fetchDetail();
    } catch (error) {
      toast.error(error, { title: 'Không thể phản hồi đề xuất' });
    } finally {
      setSuggestionResponding(false);
    }
  };

  const renderActionButtons = () => {
    const buttons = [];

    const canReviewNow = canReviewFromDetail && workflowStatus === 'PENDING';
    if (canReviewFromDetail) {
      buttons.push(
        {
          key: 'approve',
          label: 'Duyệt',
          icon: CheckCircle2,
          variant: 'success',
          onClick: handleApprove,
          disabled: !canReviewNow || actionLoading,
          loading: actionLoading && canReviewNow,
        }
      );
      buttons.push(
        {
          key: 'reject',
          label: 'Từ chối',
          icon: XCircle,
          variant: 'destructive',
          onClick: handleReject,
          disabled: !canReviewNow || actionLoading,
        }
      );
    }

    if (canManageWorkflowFromDetail) {
      if (workflowStatus === 'APPROVED') {
        buttons.push(
          {
            key: 'publish',
            label: 'Xuất bản',
            icon: Globe,
            variant: 'success',
            onClick: handlePublish,
            disabled: actionLoading,
            loading: actionLoading,
          }
        );
      } else if (workflowStatus === 'PUBLISHED') {
        buttons.push(
          {
            key: 'unpublish',
            label: 'Gỡ xuất bản',
            icon: RotateCcw,
            variant: 'outline',
            onClick: handleUnpublish,
            disabled: actionLoading,
            loading: actionLoading,
          }
        );
      }

      if (editPath) {
        buttons.push(
          {
            key: 'edit',
            label: 'Chỉnh sửa',
            icon: Pencil,
            onClick: () => navigate(editPath),
            disabled: actionLoading,
          }
        );
      }
    } else if (editPath) {
      buttons.push(
        {
          key: 'edit-fallback',
          label: 'Chỉnh sửa',
          icon: Pencil,
          onClick: () => navigate(editPath),
        }
      );
    }

    if (canRespondSuggestion) {
      buttons.push({
        key: 'respond-suggestion',
        label: 'Phản hồi',
        icon: MessageSquare,
        variant: 'primary',
        onClick: openSuggestionResponseModal,
        disabled: suggestionResponding,
      });
    }

    return buttons;
  };

  const readonlyFieldClass =
    'bg-muted/50 text-foreground disabled:bg-muted/50 disabled:text-foreground disabled:cursor-not-allowed';

  if (!config) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Không hỗ trợ loại dữ liệu"
          description={`Không tìm thấy cấu hình cho loại: ${routeEntityType || '—'}`}
          breadcrumbs={breadcrumbs}
        />
        <div className="bg-card border border-border/60 rounded-xl p-6">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay về Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <CreateFormPage
        title={`Chi tiết ${config.label}`}
        description={`Xem thông tin chi tiết của ${config.label.toLowerCase()}`}
        breadcrumbs={breadcrumbs}
        formId="entity-detail-form"
        onSubmit={(event) => event.preventDefault()}
        onCancel={() => navigate(backPath)}
        saving={false}
        showSubmitAction={false}
        cancelLabel="Quay lại danh sách"
        actionHint={`Trạng thái hiện tại: ${getStatusLabel(workflowStatus || data?.status || '-')}`}
        extraActions={renderActionButtons()}
      >
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="py-8 text-sm text-muted-foreground">Không có dữ liệu chi tiết</div>
        ) : (
          <div className="space-y-3">
            {isWorkflowEntity && (
              <div className="rounded-xl border border-border/60 bg-muted/25 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Phản hồi từ người duyệt</h3>
                  {reviewerFeedbackLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                {latestReviewerFeedback ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      {latestReviewerFeedback?.reviewerName || 'Reviewer'} •{' '}
                      {getApprovalDecisionLabel(latestReviewerFeedback?.decision)} •{' '}
                      {formatDateTimeValue(latestReviewerFeedback?.reviewedAt)}
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {latestReviewerFeedback?.comments}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có nhận xét từ reviewer</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {config.fields.map((field) => {
                const value = resolveFieldValue(field);
                if (field.textarea) {
                  return (
                    <div key={field.key} className="md:col-span-2">
                      <FormField label={field.label}>
                        <FormTextarea rows={4} value={value} readOnly disabled className={readonlyFieldClass} />
                      </FormField>
                    </div>
                  );
                }
                return (
                  <FormField key={field.key} label={field.label}>
                    <FormInput value={value} readOnly disabled className={readonlyFieldClass} />
                  </FormField>
                );
              })}
            </div>

            {config.mediaEntityType && resolvedEntityId ? (
              <div className="rounded-xl border border-border/60 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Media</h3>
                <EntityMediaPreview entityType={config.mediaEntityType} entityId={resolvedEntityId} />
              </div>
            ) : null}
          </div>
        )}
      </CreateFormPage>

      <Modal
        open={rejectModalOpen}
        onClose={closeRejectModal}
        title="Từ chối nội dung"
        width={620}
        footer={(
          <>
            <Button variant="outline" onClick={closeRejectModal} disabled={actionLoading}>Hủy</Button>
            <Button variant="destructive" onClick={submitReject} loading={actionLoading}>Xác nhận từ chối</Button>
          </>
        )}
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Nhập lý do từ chối để gửi lại cho người biên tập.</p>
          <FormTextarea
            rows={5}
            value={rejectComment}
            onChange={(event) => setRejectComment(event.target.value)}
            placeholder="Nhập lý do từ chối..."
          />
        </div>
      </Modal>

      <Modal
        open={suggestionResponseOpen}
        onClose={closeSuggestionResponseModal}
        title="Phản hồi nội dung đề xuất"
        width={620}
        footer={(
          <>
            <Button variant="outline" onClick={closeSuggestionResponseModal} disabled={suggestionResponding}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitSuggestionResponse('REJECTED')}
              loading={suggestionResponding}
            >
              Từ chối
            </Button>
            <Button
              variant="success"
              onClick={() => submitSuggestionResponse('ACCEPTED')}
              loading={suggestionResponding}
            >
              Chấp nhận
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nhập phản hồi của quản trị viên để chấp nhận hoặc từ chối đề xuất.
          </p>
          <FormTextarea
            rows={5}
            value={suggestionResponse}
            onChange={(event) => setSuggestionResponse(event.target.value)}
            placeholder="Nhập phản hồi..."
          />
        </div>
      </Modal>
    </div>
  );
};

export default EntityDetailPage;
