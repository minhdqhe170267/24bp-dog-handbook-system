import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { FormField, FormInput, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';

const defaultForm = {
  roadmapName: '',
  targetRole: '',
  totalDurationWeeks: '',
  description: '',
  phaseName: '',
  phaseOrder: '',
  phaseDurationWeeks: '',
  phaseObjectives: '',
  assessmentCriteria: '',
};

const RoadmapsCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const parsedRouteId = Number(id);
  const entityIdFromRoute = Number.isFinite(parsedRouteId) ? parsedRouteId : null;
  const isEditMode = entityIdFromRoute != null;
  const toast = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [entityId, setEntityId] = useState(null);
  const [entityStatus, setEntityStatus] = useState('DRAFT');
  const [formData, setFormData] = useState(defaultForm);
  const canPublish = user?.role === 'ADMIN';

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const buildPayload = () => ({
    roadmapName: formData.roadmapName.trim(),
    targetRole: formData.targetRole.trim(),
    totalDurationWeeks: formData.totalDurationWeeks ? Number(formData.totalDurationWeeks) : null,
    description: formData.description.trim(),
    phaseName: formData.phaseName.trim(),
    phaseOrder: formData.phaseOrder ? Number(formData.phaseOrder) : null,
    phaseDurationWeeks: formData.phaseDurationWeeks ? Number(formData.phaseDurationWeeks) : null,
    phaseObjectives: formData.phaseObjectives.trim(),
    assessmentCriteria: formData.assessmentCriteria.trim(),
  });

  const validate = () => {
    if (!formData.roadmapName.trim()) {
      toast.error('Vui lòng nhập tên lộ trình');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/roadmaps/${entityIdFromRoute}`);
        const detail = res?.data || res || {};
        const nextId = detail.roadmapId || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          roadmapName: detail.roadmapName || '',
          targetRole: detail.targetRole || '',
          totalDurationWeeks: detail.totalDurationWeeks ?? '',
          description: detail.description || '',
          phaseName: detail.phaseName || '',
          phaseOrder: detail.phaseOrder ?? '',
          phaseDurationWeeks: detail.phaseDurationWeeks ?? '',
          phaseObjectives: detail.phaseObjectives || '',
          assessmentCriteria: detail.assessmentCriteria || '',
        });
      } catch (error) {
        toast.error(error?.message || 'Không tải được chi tiết lộ trình');
        navigate('/training/roadmaps');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [entityIdFromRoute, isEditMode, navigate, toast]);

  const persistEntity = async () => {
    if (!validate()) return null;
    const payload = buildPayload();
    const targetId = entityId || entityIdFromRoute;
    const res = targetId
      ? await api.put(`/roadmaps/${targetId}`, payload)
      : await api.post('/roadmaps', payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.roadmapId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();
    if (!nextId) throw new Error('Không lấy được ID lộ trình');
    setEntityId(nextId);
    setEntityStatus(nextStatus);
    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp lộ trình');
      navigate('/training/roadmaps');
    } catch (error) {
      toast.error(error?.message || 'Không thể lưu nháp lộ trình');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      await approvalService.submit(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, saved.id);
      toast.success('Đã gửi duyệt lộ trình');
      navigate('/training/roadmaps');
    } catch (error) {
      toast.error(error?.message || 'Không thể gửi duyệt lộ trình');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!canPublish) {
      toast.error('Bạn không có quyền xuất bản');
      return;
    }
    if (!entityId || entityStatus !== 'APPROVED') {
      toast.error('Chỉ xuất bản khi bản ghi đã ở trạng thái ĐÃ DUYỆT');
      return;
    }
    setPublishing(true);
    try {
      await approvalService.publish(APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP, entityId);
      toast.success('Đã xuất bản lộ trình');
      navigate('/training/roadmaps');
    } catch (error) {
      toast.error(error?.message || 'Không thể xuất bản lộ trình');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa lộ trình huấn luyện' : 'Tạo lộ trình huấn luyện'}
      description={isEditMode ? 'Cập nhật lộ trình huấn luyện' : 'Thêm lộ trình huấn luyện mới'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Lộ trình', href: '/training/roadmaps' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="roadmap-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/training/roadmaps')}
      saving={saving || loadingDetail}
      saveLabel="Gửi duyệt"
      actionHint={`Trạng thái hiện tại: ${entityStatus}`}
      extraActions={[
        { key: 'draft', label: 'Lưu nháp', onClick: handleSaveDraft, loading: savingDraft },
        {
          key: 'publish',
          label: 'Xuất bản',
          onClick: handlePublish,
          loading: publishing,
          disabled: !canPublish || entityStatus !== 'APPROVED' || !entityId,
          variant: 'secondary',
        },
      ]}
    >
      <FormField label="Tên lộ trình" required>
        <FormInput value={formData.roadmapName} onChange={(e) => updateField('roadmapName', e.target.value)} />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Vai trò mục tiêu">
          <FormInput value={formData.targetRole} onChange={(e) => updateField('targetRole', e.target.value)} />
        </FormField>
        <FormField label="Tổng thời gian (tuần)">
          <FormInput type="number" value={formData.totalDurationWeeks} onChange={(e) => updateField('totalDurationWeeks', e.target.value)} />
        </FormField>
      </div>
      <FormField label="Mô tả">
        <FormTextarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField label="Tên giai đoạn">
          <FormInput value={formData.phaseName} onChange={(e) => updateField('phaseName', e.target.value)} />
        </FormField>
        <FormField label="Thứ tự giai đoạn">
          <FormInput type="number" value={formData.phaseOrder} onChange={(e) => updateField('phaseOrder', e.target.value)} />
        </FormField>
        <FormField label="Thời gian giai đoạn (tuần)">
          <FormInput type="number" value={formData.phaseDurationWeeks} onChange={(e) => updateField('phaseDurationWeeks', e.target.value)} />
        </FormField>
      </div>
      <FormField label="Mục tiêu giai đoạn">
        <FormTextarea rows={2} value={formData.phaseObjectives} onChange={(e) => updateField('phaseObjectives', e.target.value)} />
      </FormField>
      <FormField label="Tiêu chí đánh giá">
        <FormTextarea rows={2} value={formData.assessmentCriteria} onChange={(e) => updateField('assessmentCriteria', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.TRAINING_ROADMAP}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default RoadmapsCreatePage;
