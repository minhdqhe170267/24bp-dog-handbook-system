import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { FormField, FormInput, FormSelect, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getStatusLabel } from '../../utils/enumLabels';

const defaultForm = {
  exerciseName: '',
  difficultyLevel: '',
  durationMinutes: '',
  description: '',
  instructions: '',
  requiredEquipment: '',
  safetyPrecautions: '',
};

const ExercisesCreatePage = () => {
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
  const canPublish = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const buildPayload = () => ({
    exerciseName: formData.exerciseName.trim(),
    difficultyLevel: formData.difficultyLevel,
    durationMinutes: formData.durationMinutes ? Number(formData.durationMinutes) : null,
    description: formData.description.trim(),
    instructions: formData.instructions.trim(),
    requiredEquipment: formData.requiredEquipment.trim(),
    safetyPrecautions: formData.safetyPrecautions.trim(),
  });

  const validate = () => {
    if (!formData.exerciseName.trim() || !formData.difficultyLevel) {
      toast.error('Vui lòng nhập tên bài tập và độ khó');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/exercises/${entityIdFromRoute}`);
        const detail = res?.data || res || {};
        const nextId = detail.exerciseId || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          exerciseName: detail.exerciseName || '',
          difficultyLevel: detail.difficultyLevel || '',
          durationMinutes: detail.durationMinutes ?? '',
          description: detail.description || '',
          instructions: detail.instructions || '',
          requiredEquipment: detail.requiredEquipment || '',
          safetyPrecautions: detail.safetyPrecautions || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết bài tập' });
        navigate('/training/exercises');
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
      ? await api.put(`/exercises/${targetId}`, payload)
      : await api.post('/exercises', payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.exerciseId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();
    if (!nextId) throw new Error('Không lấy được ID bài tập');
    setEntityId(nextId);
    setEntityStatus(nextStatus);
    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp bài tập');
      navigate('/training/exercises');
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu nháp bài tập' });
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
      await approvalService.submit(APPROVAL_ENTITY_TYPES.TRAINING_EXERCISE, saved.id);
      toast.success('Đã gửi duyệt bài tập');
      navigate('/training/exercises');
    } catch (error) {
      toast.error(error, { title: 'Không thể gửi duyệt bài tập' });
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
      await approvalService.publish(APPROVAL_ENTITY_TYPES.TRAINING_EXERCISE, entityId);
      toast.success('Đã xuất bản bài tập');
      navigate('/training/exercises');
    } catch (error) {
      toast.error(error, { title: 'Không thể xuất bản bài tập' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa bài tập huấn luyện' : 'Tạo bài tập huấn luyện'}
      description={isEditMode ? 'Cập nhật bài tập huấn luyện' : 'Thêm bài tập huấn luyện mới'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Bài tập', href: '/training/exercises' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="exercise-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/training/exercises')}
      saving={saving || loadingDetail}
      saveLabel="Gửi duyệt"
      actionHint={`Trạng thái hiện tại: ${getStatusLabel(entityStatus)}`}
      extraActions={[
        { key: 'draft', label: 'Lưu nháp', onClick: handleSaveDraft, loading: savingDraft },
        {
          key: 'publish',
          label: 'Xuất bản',
          onClick: handlePublish,
          loading: publishing,
          disabled: !canPublish || entityStatus !== 'APPROVED' || !entityId,
          variant: 'success',
        },
      ]}
    >
      <FormField label="Tên bài tập" required>
        <FormInput value={formData.exerciseName} onChange={(e) => updateField('exerciseName', e.target.value)} />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Độ khó" required>
          <FormSelect
            value={formData.difficultyLevel}
            onChange={(e) => updateField('difficultyLevel', e.target.value)}
            placeholder="Chọn độ khó"
            options={[
              { value: 'BASIC', label: 'Cơ bản' },
              { value: 'INTERMEDIATE', label: 'Trung bình' },
              { value: 'ADVANCED', label: 'Nâng cao' },
            ]}
          />
        </FormField>
        <FormField label="Thời gian (phút)">
          <FormInput type="number" value={formData.durationMinutes} onChange={(e) => updateField('durationMinutes', e.target.value)} />
        </FormField>
      </div>
      <FormField label="Mô tả">
        <FormTextarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <FormField label="Hướng dẫn">
        <FormTextarea rows={3} value={formData.instructions} onChange={(e) => updateField('instructions', e.target.value)} />
      </FormField>
      <FormField label="Thiết bị cần thiết">
        <FormInput value={formData.requiredEquipment} onChange={(e) => updateField('requiredEquipment', e.target.value)} />
      </FormField>
      <FormField label="Lưu ý an toàn">
        <FormTextarea rows={3} value={formData.safetyPrecautions} onChange={(e) => updateField('safetyPrecautions', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.TRAINING_EXERCISE}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default ExercisesCreatePage;
