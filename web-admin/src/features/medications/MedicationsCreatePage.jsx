import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { FormField, FormInput, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { medicationService } from '../../services/medicationService';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getStatusLabel } from '../../utils/enumLabels';
import { validateMedicationForm } from '../../utils/formValidation';

const defaultForm = {
  medicationName: '',
  description: '',
  dosageInstructions: '',
  administrationMethod: '',
  sideEffects: '',
  contraindications: '',
  storageRequirements: '',
};

const MedicationsCreatePage = () => {
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
    medicationName: formData.medicationName.trim(),
    description: formData.description.trim(),
    dosageInstructions: formData.dosageInstructions.trim(),
    administrationMethod: formData.administrationMethod.trim(),
    sideEffects: formData.sideEffects.trim(),
    contraindications: formData.contraindications.trim(),
    storageRequirements: formData.storageRequirements.trim(),
  });

  const validate = () => {
    const errors = validateMedicationForm(formData);
    if (errors.length > 0) {
      toast.error({
        title: 'Thông tin thuốc chưa hợp lệ',
        description: errors,
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await medicationService.getById(entityIdFromRoute);
        const detail = res?.data || res || {};
        const nextId = detail.medicationId || detail.id || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          medicationName: detail.medicationName || '',
          description: detail.description || '',
          dosageInstructions: detail.dosageInstructions || '',
          administrationMethod: detail.administrationMethod || '',
          sideEffects: detail.sideEffects || '',
          contraindications: detail.contraindications || '',
          storageRequirements: detail.storageRequirements || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết thuốc' });
        navigate('/medications');
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
      ? await medicationService.update(targetId, payload)
      : await medicationService.create(payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.medicationId || responseData.id || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();

    if (!nextId) throw new Error('Không lấy được ID thuốc');

    setEntityId(nextId);
    setEntityStatus(nextStatus);

    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp thuốc');
      navigate('/medications');
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu nháp thuốc' });
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
      await approvalService.submit(APPROVAL_ENTITY_TYPES.MEDICATION, saved.id);
      toast.success('Đã gửi duyệt thuốc');
      navigate('/medications');
    } catch (error) {
      toast.error(error, { title: 'Không thể gửi duyệt thuốc' });
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
      await approvalService.publish(APPROVAL_ENTITY_TYPES.MEDICATION, entityId);
      toast.success('Đã xuất bản thuốc');
      navigate('/medications');
    } catch (error) {
      toast.error(error, { title: 'Không thể xuất bản thuốc' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa thuốc' : 'Tạo thuốc'}
      description={isEditMode ? 'Cập nhật dữ liệu thuốc' : 'Thêm dữ liệu thuốc mới'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Thuốc', href: '/medications' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="medication-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/medications')}
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
      <FormField label="Tên thuốc" required>
        <FormInput maxLength={200} value={formData.medicationName} onChange={(e) => updateField('medicationName', e.target.value)} />
      </FormField>
      <FormField label="Mô tả">
        <FormTextarea maxLength={255} rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <FormField label="Liều dùng">
        <FormTextarea maxLength={255} rows={2} value={formData.dosageInstructions} onChange={(e) => updateField('dosageInstructions', e.target.value)} />
      </FormField>
      <FormField label="Phương pháp dùng">
        <FormInput maxLength={200} value={formData.administrationMethod} onChange={(e) => updateField('administrationMethod', e.target.value)} />
      </FormField>
      <FormField label="Tác dụng phụ">
        <FormTextarea maxLength={255} rows={2} value={formData.sideEffects} onChange={(e) => updateField('sideEffects', e.target.value)} />
      </FormField>
      <FormField label="Chống chỉ định">
        <FormTextarea maxLength={255} rows={2} value={formData.contraindications} onChange={(e) => updateField('contraindications', e.target.value)} />
      </FormField>
      <FormField label="Bảo quản">
        <FormTextarea maxLength={255} rows={2} value={formData.storageRequirements} onChange={(e) => updateField('storageRequirements', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.MEDICATION}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default MedicationsCreatePage;

