import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CreateFormPage from '../../components/shared/CreateFormPage';
import { FormField, FormInput, FormSelect } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { userService } from '../../services/userService';

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
  const [formData, setFormData] = useState(defaultForm);

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isEditMode) return;

    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await userService.getById(entityIdFromRoute);
        const detail = res?.data || res || {};
        setFormData({
          username: detail.username || '',
          password: '',
          fullName: detail.fullName || '',
          email: detail.email || '',
          phone: detail.phone || '',
          role: detail.role || '',
          militaryRank: detail.militaryRank || '',
          unit: detail.unit || '',
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được chi tiết người dùng' });
        navigate('/system/users');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [entityIdFromRoute, isEditMode, navigate, toast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.role) {
      toast.error('Vui lòng nhập đủ thông tin bắt buộc');
      return;
    }
    if (!isEditMode && !formData.password.trim()) {
      toast.error('Vui lòng nhập mật khẩu');
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
      toast.error(error, { title: isEditMode ? 'Không thể cập nhật người dùng' : 'Không thể tạo người dùng' });
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
      saving={saving || loadingDetail}
      saveLabel={isEditMode ? 'Cập nhật người dùng' : 'Tạo người dùng'}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Tên đăng nhập" required>
          <FormInput value={formData.username} onChange={(e) => updateField('username', e.target.value)} />
        </FormField>
        <FormField label={isEditMode ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'} required={!isEditMode}>
          <FormInput type="password" value={formData.password} onChange={(e) => updateField('password', e.target.value)} />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Họ tên" required>
          <FormInput value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
        </FormField>
        <FormField label="Vai trò" required>
          <FormSelect
            value={formData.role}
            onChange={(e) => updateField('role', e.target.value)}
            placeholder="Chọn vai trò"
            options={roleOptions}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Email">
          <FormInput type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
        </FormField>
        <FormField label="Số điện thoại">
          <FormInput value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField label="Quân hàm">
          <FormInput value={formData.militaryRank} onChange={(e) => updateField('militaryRank', e.target.value)} />
        </FormField>
        <FormField label="Đơn vị">
          <FormInput value={formData.unit} onChange={(e) => updateField('unit', e.target.value)} />
        </FormField>
      </div>
    </CreateFormPage>
  );
};

export default UserCreatePage;
