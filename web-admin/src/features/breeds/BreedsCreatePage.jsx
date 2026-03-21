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
  breedName: '',
  origin: '',
  sizeClassification: '',
  trainabilityLevel: '',
  lifespanYears: '',
  description: '',
  operationalCapabilities: '',
};

const BreedsCreatePage = () => {
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
    breedName: formData.breedName.trim(),
    origin: formData.origin.trim(),
    sizeClassification: formData.sizeClassification || null,
    trainabilityLevel: formData.trainabilityLevel || null,
    lifespanYears: formData.lifespanYears.trim(),
    description: formData.description.trim(),
    operationalCapabilities: formData.operationalCapabilities.trim(),
  });

  const validate = () => {
    if (!formData.breedName.trim()) {
      toast.error('Vui lòng nhập tên giống chó');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/breeds/${entityIdFromRoute}`);
        const detail = res?.data || res || {};
        const nextId = detail.breedId || entityIdFromRoute;

        setEntityId(nextId);
        setEntityStatus(String(detail.status || 'DRAFT').toUpperCase());
        setFormData({
          breedName: detail.breedName || '',
          origin: detail.origin || '',
          sizeClassification: detail.sizeClassification || '',
          trainabilityLevel: detail.trainabilityLevel || '',
          lifespanYears: detail.lifespanYears || '',
          description: detail.description || '',
          operationalCapabilities: detail.operationalCapabilities || '',
        });
      } catch (error) {
        toast.error(error?.message || 'Không tải được chi tiết giống chó');
        navigate('/breeds');
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
      ? await api.put(`/breeds/${targetId}`, payload)
      : await api.post('/breeds', payload);
    const responseData = res?.data || res || {};
    const nextId = responseData.breedId || targetId;
    const nextStatus = String(responseData.status || entityStatus || 'DRAFT').toUpperCase();

    if (!nextId) throw new Error('Không lấy được ID giống chó');

    setEntityId(nextId);
    setEntityStatus(nextStatus);

    return { id: nextId, status: nextStatus };
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const saved = await persistEntity();
      if (!saved) return;
      toast.success('Đã lưu nháp giống chó');
      navigate('/breeds');
    } catch (error) {
      toast.error(error?.message || 'Không thể lưu nháp giống chó');
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
      await approvalService.submit(APPROVAL_ENTITY_TYPES.DOG_BREED, saved.id);
      toast.success('Đã gửi duyệt giống chó');
      navigate('/breeds');
    } catch (error) {
      toast.error(error?.message || 'Không thể gửi duyệt giống chó');
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
      await approvalService.publish(APPROVAL_ENTITY_TYPES.DOG_BREED, entityId);
      toast.success('Đã xuất bản giống chó');
      navigate('/breeds');
    } catch (error) {
      toast.error(error?.message || 'Không thể xuất bản giống chó');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa giống chó' : 'Tạo giống chó'}
      description={isEditMode ? 'Cập nhật thông tin giống chó nghiệp vụ' : 'Thêm thông tin giống chó nghiệp vụ mới'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Giống chó', href: '/breeds' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="breed-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/breeds')}
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
      <FormField label="Tên giống" required>
        <FormInput value={formData.breedName} onChange={(e) => updateField('breedName', e.target.value)} />
      </FormField>
      <FormField label="Nguồn gốc">
        <FormInput value={formData.origin} onChange={(e) => updateField('origin', e.target.value)} />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Kích thước">
          <FormSelect
            value={formData.sizeClassification}
            onChange={(e) => updateField('sizeClassification', e.target.value)}
            placeholder="Chọn kích thước"
            options={[
              { value: 'SMALL', label: 'Nhỏ' },
              { value: 'MEDIUM', label: 'Trung bình' },
              { value: 'LARGE', label: 'Lớn' },
              { value: 'GIANT', label: 'Khổng lồ' },
            ]}
          />
        </FormField>
        <FormField label="Khả năng huấn luyện">
          <FormSelect
            value={formData.trainabilityLevel}
            onChange={(e) => updateField('trainabilityLevel', e.target.value)}
            placeholder="Chọn mức độ"
            options={[
              { value: 'LOW', label: 'Thấp' },
              { value: 'MEDIUM', label: 'Trung bình' },
              { value: 'HIGH', label: 'Cao' },
              { value: 'VERY_HIGH', label: 'Rất cao' },
            ]}
          />
        </FormField>
      </div>
      <FormField label="Tuổi thọ">
        <FormInput value={formData.lifespanYears} onChange={(e) => updateField('lifespanYears', e.target.value)} />
      </FormField>
      <FormField label="Mô tả">
        <FormTextarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
      </FormField>
      <FormField label="Khả năng tác chiến">
        <FormTextarea rows={3} value={formData.operationalCapabilities} onChange={(e) => updateField('operationalCapabilities', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType={APPROVAL_ENTITY_TYPES.DOG_BREED}
        entityId={entityId}
        onEnsureEntity={persistEntity}
      />
    </CreateFormPage>
  );
};

export default BreedsCreatePage;
