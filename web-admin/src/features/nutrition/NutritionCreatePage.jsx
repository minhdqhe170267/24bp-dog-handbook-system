import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { FormField, FormInput, FormSelect, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';

const defaultForm = {
  rationCode: '',
  rationName: '',
  activityLevel: '',
  description: '',
  specialNotes: '',
};

const NutritionCreatePage = () => {
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
    rationCode: formData.rationCode.trim(),
    rationName: formData.rationName.trim(),
    activityLevel: formData.activityLevel || null,
    description: formData.description.trim(),
    specialNotes: formData.specialNotes.trim(),
  });

  const validate = () => {
    if (!formData.rationCode.trim() || !formData.rationName.trim()) {
      toast.error('Vui lòng nhập mã khẩu phần và tên khẩu phần');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/nutrition-standards/${entityIdFromRoute}`);
        const detail = res?.data || res || {};
        const nextId = detail.standardId || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          rationCode: detail.rationCode || '',
          rationName: detail.rationName || '',
          activityLevel: detail.activityLevel || '',
          description: detail.description || '',
          specialNotes: detail.specialNotes || '',
        });
      } catch (error) {
        toast.error(error?.message || 'Không tải được chi tiết khẩu phần');
        navigate('/nutrition');
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
      ? await api.put(`/nutrition-standards/${targetId}`, payload)
      : await api.post('/nutrition-standards', payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.standardId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();

    if (!nextId) throw new Error('Không lấy được ID khẩu phần');

    setEntityId(nextId);
    setEntityStatus(nextStatus);
    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp khẩu phần');
      navigate('/nutrition');
    } catch (error) {
      toast.error(error?.message || 'Không thể lưu nháp khẩu phần');
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
      await approvalService.submit(APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD, saved.id);
      toast.success('Đã gửi duyệt khẩu phần');
      navigate('/nutrition');
    } catch (error) {
      toast.error(error?.message || 'Không thể gửi duyệt khẩu phần');
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
      await approvalService.publish(APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD, entityId);
      toast.success('Đã xuất bản khẩu phần');
      navigate('/nutrition');
    } catch (error) {
      toast.error(error?.message || 'Không thể xuất bản khẩu phần');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa khẩu phần dinh dưỡng' : 'Tạo khẩu phần dinh dưỡng'}
      description={isEditMode ? 'Cập nhật tiêu chuẩn dinh dưỡng cho chó nghiệp vụ' : 'Thêm tiêu chuẩn dinh dưỡng mới cho chó nghiệp vụ'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Dinh dưỡng', href: '/nutrition' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="nutrition-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/nutrition')}
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
      <FormField label="Mã khẩu phần" required>
        <FormInput value={formData.rationCode} onChange={(e) => updateField('rationCode', e.target.value)} />
      </FormField>
      <FormField label="Tên khẩu phần" required>
        <FormInput value={formData.rationName} onChange={(e) => updateField('rationName', e.target.value)} />
      </FormField>
      <FormField label="Mức hoạt động">
        <FormSelect
          value={formData.activityLevel}
          onChange={(e) => updateField('activityLevel', e.target.value)}
          placeholder="Chọn mức hoạt động"
          options={[
            { value: 'LOW', label: 'Nhẹ' },
            { value: 'MEDIUM', label: 'Trung bình' },
            { value: 'HIGH', label: 'Nặng' },
          ]}
        />
      </FormField>
      <FormField label="Mô tả">
        <FormTextarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <FormField label="Ghi chú đặc biệt">
        <FormTextarea rows={3} value={formData.specialNotes} onChange={(e) => updateField('specialNotes', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default NutritionCreatePage;
