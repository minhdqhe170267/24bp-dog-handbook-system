import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import { FormField, FormInput, FormTextarea, FormSwitch } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import trainingSpecialtyService from '../../services/trainingSpecialtyService';
import { validateSpecialtyForm } from '../../utils/formValidation';

const defaultForm = {
  specialtyCode: '',
  specialtyName: '',
  description: '',
  isActive: true,
};

const SpecialtiesCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const specialtyId = Number.isFinite(Number(id)) ? Number(id) : null;
  const isEditMode = specialtyId != null;
  const toast = useToast();
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!isEditMode) return;

    let active = true;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const response = await trainingSpecialtyService.getById(specialtyId);
        const detail = response?.data ?? response ?? {};
        if (!active) return;

        setFormData({
          specialtyCode: detail.specialtyCode || '',
          specialtyName: detail.specialtyName || '',
          description: detail.description || '',
          isActive: detail.isActive !== false,
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chuyên ngành' });
        navigate('/training/specialties');
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [isEditMode, navigate, specialtyId, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = validateSpecialtyForm(formData);
    if (errors.length > 0) {
      toast.error({
        title: 'Thông tin chuyên ngành chưa hợp lệ',
        description: errors,
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        specialtyCode: formData.specialtyCode.trim(),
        specialtyName: formData.specialtyName.trim(),
        description: formData.description.trim() || null,
        isActive: Boolean(formData.isActive),
      };

      if (isEditMode) {
        await trainingSpecialtyService.update(specialtyId, payload);
        toast.success('Cập nhật chuyên ngành thành công');
      } else {
        await trainingSpecialtyService.create(payload);
        toast.success('Tạo chuyên ngành thành công');
      }

      navigate('/training/specialties');
    } catch (error) {
      toast.error(error, {
        title: isEditMode ? 'Không thể cập nhật chuyên ngành' : 'Không thể tạo chuyên ngành',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa chuyên ngành huấn luyện' : 'Tạo chuyên ngành huấn luyện'}
      description={isEditMode ? 'Cập nhật thư viện chuyên ngành huấn luyện' : 'Thêm chuyên ngành mới cho hệ thống'}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Huấn luyện' },
        { label: 'Chuyên ngành', href: '/training/specialties' },
        { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' },
      ]}
      formId="specialty-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/training/specialties')}
      saving={saving || loadingDetail}
      saveLabel={isEditMode ? 'Cập nhật chuyên ngành' : 'Tạo chuyên ngành'}
      actionHint="Chuyên ngành là tầng cha của toàn bộ lộ trình huấn luyện."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Mã chuyên ngành" required>
          <FormInput
            maxLength={50}
            value={formData.specialtyCode}
            onChange={(event) => updateField('specialtyCode', event.target.value)}
          />
        </FormField>
        <FormField label="Tên chuyên ngành" required>
          <FormInput
            maxLength={150}
            value={formData.specialtyName}
            onChange={(event) => updateField('specialtyName', event.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Mô tả">
        <FormTextarea
          maxLength={255}
          rows={5}
          value={formData.description}
          onChange={(event) => updateField('description', event.target.value)}
        />
      </FormField>
      <FormField label="Trạng thái">
        <FormSwitch
          checked={Boolean(formData.isActive)}
          onChange={(nextValue) => updateField('isActive', nextValue)}
          label={formData.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
        />
      </FormField>
    </CreateFormPage>
  );
};

export default SpecialtiesCreatePage;

