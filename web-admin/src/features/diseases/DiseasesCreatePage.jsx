import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { FormField, FormInput, FormSelect, FormSwitch, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { diseaseService } from '../../services/diseaseService';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getStatusLabel } from '../../utils/enumLabels';
import { validateDiseaseForm } from '../../utils/formValidation';

const defaultForm = {
  diseaseName: '',
  severityLevel: '',
  description: '',
  commonSymptoms: '',
  treatment: '',
  preventionMethods: '',
  isContagious: false,
};

const DiseasesCreatePage = () => {
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
    diseaseName: formData.diseaseName.trim(),
    severityLevel: formData.severityLevel || null,
    description: formData.description.trim(),
    commonSymptoms: formData.commonSymptoms.trim(),
    treatment: formData.treatment.trim(),
    preventionMethods: formData.preventionMethods.trim(),
    isContagious: Boolean(formData.isContagious),
  });

  const validate = () => {
    const errors = validateDiseaseForm(formData);
    if (errors.length > 0) {
      toast.error({
        title: 'Thông tin bệnh chưa hợp lệ',
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
        const res = await diseaseService.getById(entityIdFromRoute);
        const detail = res?.data || res || {};
        const nextId = detail.diseaseId || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          diseaseName: detail.diseaseName || '',
          severityLevel: detail.severityLevel || '',
          description: detail.description || '',
          commonSymptoms: detail.commonSymptoms || '',
          treatment: detail.treatment || '',
          preventionMethods: detail.preventionMethods || '',
          isContagious: Boolean(detail.isContagious),
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết bệnh' });
        navigate('/diseases');
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
      ? await diseaseService.update(targetId, payload)
      : await diseaseService.create(payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.diseaseId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();
    if (!nextId) throw new Error('Không lấy được ID bệnh');
    setEntityId(nextId);
    setEntityStatus(nextStatus);
    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp bệnh');
      navigate('/diseases');
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu nháp bệnh' });
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
      await approvalService.submit(APPROVAL_ENTITY_TYPES.DISEASE, saved.id);
      toast.success('Đã gửi duyệt bệnh');
      navigate('/diseases');
    } catch (error) {
      toast.error(error, { title: 'Không thể gửi duyệt bệnh' });
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
      await approvalService.publish(APPROVAL_ENTITY_TYPES.DISEASE, entityId);
      toast.success('Đã xuất bản bệnh');
      navigate('/diseases');
    } catch (error) {
      toast.error(error, { title: 'Không thể xuất bản bệnh' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa bệnh' : 'Tạo bệnh'}
      description={isEditMode ? 'Cập nhật dữ liệu bệnh cho hệ thống sức khỏe' : 'Thêm dữ liệu bệnh cho hệ thống sức khỏe'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Bệnh', href: '/diseases' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="disease-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/diseases')}
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
      <FormField label="Tên bệnh" required>
        <FormInput maxLength={200} value={formData.diseaseName} onChange={(e) => updateField('diseaseName', e.target.value)} />
      </FormField>
      <FormField label="Mức độ">
        <FormSelect
          value={formData.severityLevel}
          onChange={(e) => updateField('severityLevel', e.target.value)}
          placeholder="Chọn mức độ"
          options={[
            { value: 'LOW', label: 'Nhẹ' },
            { value: 'MEDIUM', label: 'Trung bình' },
            { value: 'HIGH', label: 'Nặng' },
            { value: 'CRITICAL', label: 'Nguy hiểm' },
          ]}
        />
      </FormField>
      <FormField label="Mô tả">
        <FormTextarea maxLength={5000} rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <FormField label="Triệu chứng">
        <FormTextarea maxLength={5000} rows={3} value={formData.commonSymptoms} onChange={(e) => updateField('commonSymptoms', e.target.value)} />
      </FormField>
      <FormField label="Điều trị">
        <FormTextarea maxLength={5000} rows={3} value={formData.treatment} onChange={(e) => updateField('treatment', e.target.value)} />
      </FormField>
      <FormField label="Phòng ngừa">
        <FormTextarea maxLength={5000} rows={3} value={formData.preventionMethods} onChange={(e) => updateField('preventionMethods', e.target.value)} />
      </FormField>
      <FormField label="Lây nhiễm">
        <FormSwitch checked={formData.isContagious} onChange={(value) => updateField('isContagious', value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.DISEASE}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default DiseasesCreatePage;
