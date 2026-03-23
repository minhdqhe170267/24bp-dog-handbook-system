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
  methodName: '',
  description: '',
  instructions: '',
  advantages: '',
  disadvantages: '',
};

const MethodsCreatePage = () => {
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
    methodName: formData.methodName.trim(),
    description: formData.description.trim(),
    instructions: formData.instructions.trim(),
    advantages: formData.advantages.trim(),
    disadvantages: formData.disadvantages.trim(),
  });

  const validate = () => {
    if (!formData.methodName.trim()) {
      toast.error('Vui lòng nhập tên phương pháp');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/training-methods/${entityIdFromRoute}`);
        const detail = res?.data || res || {};
        const nextId = detail.methodId || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          methodName: detail.methodName || '',
          description: detail.description || '',
          instructions: detail.instructions || '',
          advantages: detail.advantages || '',
          disadvantages: detail.disadvantages || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết phương pháp' });
        navigate('/training/methods');
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
      ? await api.put(`/training-methods/${targetId}`, payload)
      : await api.post('/training-methods', payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.methodId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();
    if (!nextId) throw new Error('Không lấy được ID phương pháp');
    setEntityId(nextId);
    setEntityStatus(nextStatus);
    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp phương pháp');
      navigate('/training/methods');
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu nháp phương pháp' });
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
      await approvalService.submit(APPROVAL_ENTITY_TYPES.TRAINING_METHOD, saved.id);
      toast.success('Đã gửi duyệt phương pháp');
      navigate('/training/methods');
    } catch (error) {
      toast.error(error, { title: 'Không thể gửi duyệt phương pháp' });
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
      await approvalService.publish(APPROVAL_ENTITY_TYPES.TRAINING_METHOD, entityId);
      toast.success('Đã xuất bản phương pháp');
      navigate('/training/methods');
    } catch (error) {
      toast.error(error, { title: 'Không thể xuất bản phương pháp' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa phương pháp huấn luyện' : 'Tạo phương pháp huấn luyện'}
      description={isEditMode ? 'Cập nhật phương pháp huấn luyện' : 'Thêm phương pháp huấn luyện mới'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Phương pháp', href: '/training/methods' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="method-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/training/methods')}
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
          variant: 'success',
        },
      ]}
    >
      <FormField label="Tên phương pháp" required>
        <FormInput value={formData.methodName} onChange={(e) => updateField('methodName', e.target.value)} />
      </FormField>
      <FormField label="Mô tả">
        <FormTextarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <FormField label="Hướng dẫn">
        <FormTextarea rows={3} value={formData.instructions} onChange={(e) => updateField('instructions', e.target.value)} />
      </FormField>
      <FormField label="Ưu điểm">
        <FormTextarea rows={2} value={formData.advantages} onChange={(e) => updateField('advantages', e.target.value)} />
      </FormField>
      <FormField label="Nhược điểm">
        <FormTextarea rows={2} value={formData.disadvantages} onChange={(e) => updateField('disadvantages', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.TRAINING_METHOD}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default MethodsCreatePage;
