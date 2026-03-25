import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { FormField, FormInput, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { firstAidGuideService } from '../../services/firstAidGuideService';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getStatusLabel } from '../../utils/enumLabels';

const defaultForm = {
  guideTitle: '',
  emergencyType: '',
  description: '',
  immediateSteps: '',
  requiredMaterials: '',
  doNotActions: '',
  whenToSeekVet: '',
};

const FirstAidGuidesCreatePage = () => {
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
    guideTitle: formData.guideTitle.trim(),
    emergencyType: formData.emergencyType.trim(),
    description: formData.description.trim(),
    immediateSteps: formData.immediateSteps.trim(),
    requiredMaterials: formData.requiredMaterials.trim(),
    doNotActions: formData.doNotActions.trim(),
    whenToSeekVet: formData.whenToSeekVet.trim(),
  });

  const validate = () => {
    if (!formData.guideTitle.trim() || !formData.emergencyType.trim() || !formData.immediateSteps.trim()) {
      toast.error('Vui lòng nhập đủ tiêu đề, loại tình huống và các bước xử lý ngay');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await firstAidGuideService.getById(entityIdFromRoute);
        const detail = res?.data || res || {};
        const nextId = detail.guideId || detail.id || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          guideTitle: detail.guideTitle || '',
          emergencyType: detail.emergencyType || '',
          description: detail.description || '',
          immediateSteps: detail.immediateSteps || '',
          requiredMaterials: detail.requiredMaterials || '',
          doNotActions: detail.doNotActions || '',
          whenToSeekVet: detail.whenToSeekVet || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết hướng dẫn sơ cứu' });
        navigate('/medical');
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
      ? await firstAidGuideService.update(targetId, payload)
      : await firstAidGuideService.create(payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.guideId || responseData.id || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();

    if (!nextId) throw new Error('Không lấy được ID hướng dẫn sơ cứu');

    setEntityId(nextId);
    setEntityStatus(nextStatus);

    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp hướng dẫn sơ cứu');
      navigate('/medical');
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu nháp hướng dẫn sơ cứu' });
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
      await approvalService.submit(APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE, saved.id);
      toast.success('Đã gửi duyệt hướng dẫn sơ cứu');
      navigate('/medical');
    } catch (error) {
      toast.error(error, { title: 'Không thể gửi duyệt hướng dẫn sơ cứu' });
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
      await approvalService.publish(APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE, entityId);
      toast.success('Đã xuất bản hướng dẫn sơ cứu');
      navigate('/medical');
    } catch (error) {
      toast.error(error, { title: 'Không thể xuất bản hướng dẫn sơ cứu' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa hướng dẫn sơ cứu' : 'Tạo hướng dẫn sơ cứu'}
      description={isEditMode ? 'Cập nhật hướng dẫn sơ cứu' : 'Thêm hướng dẫn sơ cứu mới cho hệ thống'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Sơ cứu', href: '/medical' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="first-aid-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/medical')}
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
      <FormField label="Tiêu đề" required>
        <FormInput value={formData.guideTitle} onChange={(e) => updateField('guideTitle', e.target.value)} />
      </FormField>
      <FormField label="Loại tình huống" required>
        <FormInput value={formData.emergencyType} onChange={(e) => updateField('emergencyType', e.target.value)} />
      </FormField>
      <FormField label="Mô tả">
        <FormTextarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <FormField label="Các bước xử lý ngay" required>
        <FormTextarea rows={4} value={formData.immediateSteps} onChange={(e) => updateField('immediateSteps', e.target.value)} />
      </FormField>
      <FormField label="Vật tư cần thiết">
        <FormTextarea rows={2} value={formData.requiredMaterials} onChange={(e) => updateField('requiredMaterials', e.target.value)} />
      </FormField>
      <FormField label="Không nên làm">
        <FormTextarea rows={2} value={formData.doNotActions} onChange={(e) => updateField('doNotActions', e.target.value)} />
      </FormField>
      <FormField label="Khi nào cần bác sĩ thú y">
        <FormTextarea rows={2} value={formData.whenToSeekVet} onChange={(e) => updateField('whenToSeekVet', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default FirstAidGuidesCreatePage;
