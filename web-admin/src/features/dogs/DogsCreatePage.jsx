import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import { FormField, FormInput, FormSelect, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import EntityMediaSection from '../../components/shared/EntityMediaSection';
import { dogService } from '../../services/dogService';
import { breedService } from '../../services/breedService';

const statusOptions = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
  { value: 'RETIRED', label: 'Nghỉ hưu' },
  { value: 'DECEASED', label: 'Đã mất' },
  { value: 'TRANSFERRED', label: 'Chuyển đơn vị' },
];

const genderOptions = [
  { value: 'MALE', label: 'Đực' },
  { value: 'FEMALE', label: 'Cái' },
];

const defaultForm = {
  dogName: '',
  breedId: '',
  gender: 'MALE',
  dateOfBirth: '',
  currentWeightKg: '',
  heightCm: '',
  color: '',
  microchipId: '',
  status: 'ACTIVE',
  notes: '',
};

const toNullableNumber = (value) => {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : '';
  }
  const two = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
};

const DogsCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const parsedRouteId = Number(id);
  const entityIdFromRoute = Number.isFinite(parsedRouteId) ? parsedRouteId : null;
  const isEditMode = entityIdFromRoute != null;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingBreeds, setLoadingBreeds] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [ensuringEntity, setEnsuringEntity] = useState(false);
  const [breeds, setBreeds] = useState([]);
  const [formData, setFormData] = useState(defaultForm);
  const [createdEntityId, setCreatedEntityId] = useState(null);

  const currentEntityId = entityIdFromRoute || createdEntityId;

  useEffect(() => {
    const fetchBreeds = async () => {
      setLoadingBreeds(true);
      try {
        const res = await breedService.getAll(0, 200, '');
        setBreeds(res.data?.content || []);
      } catch {
        toast.error('Không tải được danh sách giống chó');
      } finally {
        setLoadingBreeds(false);
      }
    };
    fetchBreeds();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entityIdFromRoute) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await dogService.getById(entityIdFromRoute);
        const detail = res?.data || res || {};

        setFormData({
          dogName: detail.dogName || '',
          breedId: detail.breedId ? String(detail.breedId) : '',
          gender: detail.gender || 'MALE',
          dateOfBirth: toDateInput(detail.dateOfBirth),
          currentWeightKg: detail.currentWeightKg ?? '',
          heightCm: detail.heightCm ?? '',
          color: detail.color || '',
          microchipId: detail.microchipId || '',
          status: detail.status || 'ACTIVE',
          notes: detail.notes || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết chó' });
        navigate('/dogs');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [entityIdFromRoute, navigate, toast]);

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const buildPayload = () => ({
    dogName: formData.dogName?.trim() || null,
    breedId: Number(formData.breedId),
    gender: formData.gender || null,
    dateOfBirth: formData.dateOfBirth || null,
    currentWeightKg: toNullableNumber(formData.currentWeightKg),
    heightCm: toNullableNumber(formData.heightCm),
    color: formData.color?.trim() || null,
    microchipId: formData.microchipId?.trim() || null,
    status: formData.status || null,
    notes: formData.notes?.trim() || null,
  });

  const parseCreatedDogId = (response) =>
    response?.data?.dogId ||
    response?.dogId ||
    response?.data?.id ||
    response?.id ||
    null;

  const ensureDogProfileForMedia = async () => {
    if (!formData.breedId) {
      toast.error('Vui lòng chọn giống chó');
      return null;
    }
    if (!formData.dogName?.trim()) {
      toast.error('Vui lòng nhập tên chó trước khi tải tệp đa phương tiện');
      return null;
    }

    if (currentEntityId) {
      return { id: currentEntityId };
    }

    setEnsuringEntity(true);
    try {
      const response = await dogService.create(buildPayload());
      const newId = parseCreatedDogId(response);
      if (!newId) throw new Error('Không lấy được ID hồ sơ chó vừa tạo');

      setCreatedEntityId(newId);
      navigate(`/dogs/${newId}/edit`, { replace: true });
      toast.success('Đã tạo hồ sơ chó để gắn tệp đa phương tiện');
      return { id: newId };
    } catch (error) {
      toast.error(error, { title: 'Không thể tạo hồ sơ chó để tải tệp đa phương tiện' });
      return null;
    } finally {
      setEnsuringEntity(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.dogName?.trim()) {
      toast.error('Vui lòng nhập tên chó');
      return;
    }
    if (!formData.breedId) {
      toast.error('Vui lòng chọn giống chó');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (currentEntityId) {
        await dogService.update(currentEntityId, payload);
        toast.success('Cập nhật hồ sơ chó thành công');
      } else {
        await dogService.create(payload);
        toast.success('Tạo hồ sơ chó thành công');
      }
      navigate('/dogs');
    } catch (error) {
      toast.error(error, { title: entityIdFromRoute ? 'Không thể cập nhật hồ sơ chó' : 'Không thể tạo hồ sơ chó' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa hồ sơ chó' : 'Tạo hồ sơ chó'}
      description={isEditMode ? 'Cập nhật hồ sơ chó nghiệp vụ' : 'Thêm hồ sơ chó nghiệp vụ mới'}
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Hồ sơ chó', href: '/dogs' }, { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' }]}
      formId="dog-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/dogs')}
      saving={saving || loadingBreeds || loadingDetail || ensuringEntity}
      saveLabel={isEditMode ? 'Cập nhật hồ sơ chó' : 'Tạo hồ sơ chó'}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Tên chó">
          <FormInput value={formData.dogName} onChange={(e) => updateField('dogName', e.target.value)} />
        </FormField>
        <FormField label="Giống chó" required>
          <FormSelect
            value={formData.breedId}
            onChange={(e) => updateField('breedId', e.target.value)}
            placeholder="Chọn giống chó"
            options={breeds.map((breed) => ({ value: breed.breedId, label: breed.breedName }))}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField label="Giới tính">
          <FormSelect value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} options={genderOptions} />
        </FormField>
        <FormField label="Ngày sinh">
          <FormInput type="date" value={formData.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
        </FormField>
        <FormField label="Trạng thái">
          <FormSelect value={formData.status} onChange={(e) => updateField('status', e.target.value)} options={statusOptions} />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Cân nặng (kg)">
          <FormInput type="number" min="0" step="0.01" value={formData.currentWeightKg} onChange={(e) => updateField('currentWeightKg', e.target.value)} />
        </FormField>
        <FormField label="Chiều cao (cm)">
          <FormInput type="number" min="0" step="0.01" value={formData.heightCm} onChange={(e) => updateField('heightCm', e.target.value)} />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Màu lông">
          <FormInput value={formData.color} onChange={(e) => updateField('color', e.target.value)} />
        </FormField>
        <FormField label="Microchip ID">
          <FormInput value={formData.microchipId} onChange={(e) => updateField('microchipId', e.target.value)} />
        </FormField>
      </div>
      <FormField label="Ghi chú">
        <FormTextarea rows={4} value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
      </FormField>
      <EntityMediaSection
        entityType="DOG_PROFILE"
        entityId={currentEntityId}
        onEnsureEntity={ensureDogProfileForMedia}
        disabled={saving || loadingBreeds || loadingDetail || ensuringEntity}
      />
    </CreateFormPage>
  );
};

export default DogsCreatePage;
