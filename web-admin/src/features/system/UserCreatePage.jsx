import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import { FormField, FormInput, FormSelect } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { userService } from '../../services/userService';
import trainingSpecialtyService from '../../services/trainingSpecialtyService';
import { validateUserForm } from '../../utils/formValidation';
import { fetchAllPages } from '../../utils/clientPagination';

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CONTENT_EDITOR', label: 'Biên tập nội dung' },
  { value: 'REVIEWER', label: 'Người duyệt' },
  { value: 'TRAINER', label: 'Huấn luyện viên' },
];

const defaultForm = {
  username: '',
  password: '',
  fullName: '',
  email: '',
  phone: '',
  role: '',
  militaryRank: '',
  unit: '',
  specialtyId: '',
};

const UserCreatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const parsedRouteId = Number(id);
  const entityIdFromRoute = Number.isFinite(parsedRouteId) ? parsedRouteId : null;
  const isEditMode = entityIdFromRoute != null;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [formData, setFormData] = useState(defaultForm);

  const isTrainer = String(formData.role || '').toUpperCase() === 'TRAINER';

  const specialtyOptions = useMemo(
    () =>
      specialties.map((item) => ({
        value: String(item.specialtyId),
        label: `${item.specialtyCode} - ${item.specialtyName}`,
      })),
    [specialties]
  );

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let active = true;

    const fetchSpecialties = async () => {
      setLoadingSpecialties(true);
      try {
        const rows = await fetchAllPages((pageIndex, batchSize) =>
          trainingSpecialtyService.getAll(pageIndex, batchSize, '')
        );
        if (active) {
          setSpecialties(Array.isArray(rows) ? rows.filter((item) => item.isActive !== false) : []);
        }
      } catch (error) {
        toast.error(error, { title: 'Không tải được danh sách chuyên ngành' });
      } finally {
        if (active) {
          setLoadingSpecialties(false);
        }
      }
    };

    fetchSpecialties();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!isEditMode) return;

    let active = true;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const response = await userService.getById(entityIdFromRoute);
        const detail = response?.data ?? response ?? {};
        if (!active) return;

        setFormData({
          username: detail.username || '',
          password: '',
          fullName: detail.fullName || '',
          email: detail.email || '',
          phone: detail.phone || '',
          role: detail.role || '',
          militaryRank: detail.militaryRank || '',
          unit: detail.unit || '',
          specialtyId: detail.specialtyId ? String(detail.specialtyId) : '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết người dùng' });
        navigate('/system/users');
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
  }, [entityIdFromRoute, isEditMode, navigate, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateUserForm(formData, { isEditMode });
    if (errors.length > 0) {
      toast.error({
        title: 'Thông tin người dùng chưa hợp lệ',
        description: errors,
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        role: formData.role,
        militaryRank: formData.militaryRank?.trim() || '',
        unit: formData.unit?.trim() || '',
        specialtyId: isTrainer && formData.specialtyId ? Number(formData.specialtyId) : null,
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (entityIdFromRoute) {
        await userService.update(entityIdFromRoute, payload);
        toast.success('Cập nhật người dùng thành công');
      } else {
        await userService.create(payload);
        toast.success('Tạo người dùng thành công');
      }
      navigate('/system/users');
    } catch (error) {
      toast.error(error, {
        title: isEditMode ? 'Không thể cập nhật người dùng' : 'Không thể tạo người dùng',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreateFormPage
      title={isEditMode ? 'Sửa người dùng' : 'Tạo người dùng'}
      description={isEditMode ? 'Cập nhật tài khoản hệ thống' : 'Thêm tài khoản mới cho hệ thống'}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Quản trị hệ thống' },
        { label: 'Quản lý người dùng', href: '/system/users' },
        { label: isEditMode ? 'Chỉnh sửa' : 'Tạo mới' },
      ]}
      formId="user-create-form"
      onSubmit={handleSubmit}
      onCancel={() => navigate('/system/users')}
      saving={saving || loadingDetail || loadingSpecialties}
      saveLabel={isEditMode ? 'Cập nhật người dùng' : 'Tạo người dùng'}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Tên đăng nhập" required>
          <FormInput
            maxLength={50}
            value={formData.username}
            onChange={(event) => updateField('username', event.target.value)}
          />
        </FormField>
        <FormField label={isEditMode ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'} required={!isEditMode}>
          <FormInput
            type="password"
            minLength={6}
            maxLength={100}
            value={formData.password}
            onChange={(event) => updateField('password', event.target.value)}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Họ tên" required>
          <FormInput
            maxLength={100}
            value={formData.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
          />
        </FormField>
        <FormField label="Vai trò" required>
          <FormSelect
            value={formData.role}
            onChange={(event) => updateField('role', event.target.value)}
            placeholder="Chọn vai trò"
            options={roleOptions}
          />
        </FormField>
      </div>
      <FormField label="Chuyên ngành" required={isTrainer}>
        <FormSelect
          value={formData.specialtyId}
          onChange={(event) => updateField('specialtyId', event.target.value)}
          placeholder={isTrainer ? 'Chọn chuyên ngành' : 'Chọn chuyên ngành (không bắt buộc)'}
          options={specialtyOptions}
        />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Email">
          <FormInput
            type="email"
            maxLength={150}
            value={formData.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </FormField>
        <FormField label="Số điện thoại" required={!isEditMode}>
          <FormInput
            maxLength={12}
            inputMode="tel"
            pattern="^(\\+84|0)[0-9]{9,10}$"
            value={formData.phone}
            onChange={(event) => updateField('phone', event.target.value)}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Quân hàm">
          <FormInput
            maxLength={50}
            value={formData.militaryRank}
            onChange={(event) => updateField('militaryRank', event.target.value)}
          />
        </FormField>
        <FormField label="Đơn vị">
          <FormInput
            maxLength={100}
            value={formData.unit}
            onChange={(event) => updateField('unit', event.target.value)}
          />
        </FormField>
      </div>
    </CreateFormPage>
  );
};

export default UserCreatePage;
