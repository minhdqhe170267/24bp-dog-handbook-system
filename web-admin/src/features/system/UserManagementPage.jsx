import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Lock, LockOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import { Modal, FormField, FormInput, FormSelect, Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { userService } from '../../services/userService';
import { cn } from '../../utils/utils';
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';
import { validateUserForm } from '../../utils/formValidation';

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'CONTENT_EDITOR', label: 'Biên tập nội dung' },
  { value: 'REVIEWER', label: 'Người duyệt' },
  { value: 'TRAINER', label: 'Huấn luyện viên' },
];

const roleLabelMap = {
  ADMIN: 'Admin',
  CONTENT_EDITOR: 'Biên tập nội dung',
  REVIEWER: 'Người duyệt',
  TRAINER: 'Huấn luyện viên',
};

const roleFilterOptions = [
  { value: 'all', label: 'Tất cả vai trò' },
  ...roleOptions.filter((role) => role.value !== 'ADMIN'),
];

const userStatusFilterOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' },
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

const getDateTimeParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: value, date: '' };
  const twoDigits = (num) => String(num).padStart(2, '0');
  return {
    time: `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`,
    date: `${twoDigits(date.getDate())}/${twoDigits(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
};

const RoleBadge = ({ role }) => {
  const roleClassMap = {
    ADMIN: 'bg-destructive/10 text-destructive',
    CONTENT_EDITOR: 'bg-info/10 text-info',
    REVIEWER: 'bg-warning/10 text-warning',
    TRAINER: 'bg-success/10 text-success',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', roleClassMap[role] || 'bg-muted text-muted-foreground')}>
      {roleLabelMap[role] || role || '—'}
    </span>
  );
};

const UserManagementPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 20, total: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [lockTarget, setLockTarget] = useState(null);
  const [formData, setFormData] = useState(defaultForm);

  const fetchData = async (nextPage = pagination.page, nextPageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const allRows = await fetchAllPages((pageIndex, batchSize) => userService.getAll(pageIndex, batchSize, search));
      const list = allRows
        .filter((item) => String(item?.role || '').toUpperCase() !== 'ADMIN')
        .filter((item) => {
          const matchRole = roleFilter === 'all' || item.role === roleFilter;
          const normalizedStatus = item.isLocked ? 'LOCKED' : 'ACTIVE';
          const matchStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
          return matchRole && matchStatus;
        })
        .map((item) => ({ ...item, id: item.userId }));
      const sortedRows = sortByNewest(list, { idKeys: ['userId', 'id'] });
      const { pageRows, totalItems, effectivePage } = paginateRows(sortedRows, nextPage, nextPageSize);
      setUsers(pageRows);
      setPagination((prev) => ({
        ...prev,
        page: effectivePage,
        total: totalItems,
      }));
    } catch (err) {
      toast.error(err, { title: 'Lỗi tải danh sách người dùng' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, pagination.pageSize);
  }, [search, roleFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (!row?.userId) return;
    navigate(`/system/users/${row.userId}/edit`);
  };

  const openDetail = (row) => {
    if (!row?.userId) return;
    navigate(`/details/USER/${row.userId}`);
  };

  const makePayload = () => {
    const payload = {
      username: formData.username.trim(),
      fullName: formData.fullName.trim(),
      email: formData.email?.trim() || '',
      phone: formData.phone?.trim() || '',
      role: formData.role,
      militaryRank: formData.militaryRank?.trim() || '',
      unit: formData.unit?.trim() || '',
    };

    if (formData.password?.trim()) {
      payload.password = formData.password.trim();
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateUserForm(formData, { isEditMode: Boolean(editing) });
    if (errors.length > 0) {
      toast.error({
        title: 'Thông tin người dùng chưa hợp lệ',
        description: errors,
      });
      return;
    }

    try {
      const payload = makePayload();
      if (editing) {
        await userService.update(editing.userId, payload);
        toast.success('Cập nhật người dùng thành công');
      } else {
        await userService.create(payload);
        toast.success('Tạo người dùng thành công');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData(defaultForm);
      setPagination((prev) => ({ ...prev, page: 0 }));
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      toast.error(err, { title: 'Không thể lưu người dùng' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await userService.delete(deleteId);
      toast.success('Đã xóa người dùng');
      setDeleteId(null);
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) {
      toast.error(err, { title: 'Không thể xóa người dùng' });
    }
  };

  const handleToggleLock = async () => {
    if (!lockTarget) return;
    try {
      await userService.toggleLock(lockTarget.userId);
      toast.success(lockTarget.isLocked ? 'Mở khóa người dùng thành công' : 'Khóa người dùng thành công');
      setLockTarget(null);
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) {
      toast.error(err, { title: 'Không thể thay đổi trạng thái khóa' });
    }
  };

  const columns = [
    { key: 'username', header: 'Tên đăng nhập', className: 'w-36', render: (row) => <span className="font-medium text-foreground">{row.username || '—'}</span> },
    { key: 'fullName', header: 'Họ tên', render: (row) => row.fullName || '—' },
    { key: 'email', header: 'Email', className: 'w-52', render: (row) => row.email || '—' },
    { key: 'phone', header: 'Số điện thoại', className: 'w-36', render: (row) => row.phone || '—' },
    { key: 'role', header: 'Vai trò', className: 'w-40', render: (row) => <RoleBadge role={row.role} /> },
    {
      key: 'specialtyName',
      header: 'Chuyên ngành',
      className: 'w-52',
      render: (row) => row.specialtyName || '—',
    },
    { key: 'isLocked', header: 'Trạng thái', className: 'w-36', render: (row) => <StatusBadge status={row.isLocked ? 'LOCKED' : 'ACTIVE'} /> },
    {
      key: 'lastLoginAt',
      header: 'Đăng nhập gần nhất',
      className: 'w-48',
      render: (row) => {
        const parts = getDateTimeParts(row.lastLoginAt);
        if (!parts) return '—';
        return (
          <div className="leading-tight">
            <div className="text-sm font-medium text-foreground">{parts.time}</div>
            <div className="text-xs text-muted-foreground">{parts.date}</div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-44',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(row)} title="Xem chi tiết">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLockTarget(row)} title={row.isLocked ? 'Mở khóa' : 'Khóa'}>
            {row.isLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.userId)} title="Xóa">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quản lý người dùng"
        description="Quản trị tài khoản hệ thống và quyền truy cập"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Quản trị hệ thống' },
          { label: 'Quản lý người dùng' },
        ]}
        actions={
          <Button onClick={() => navigate('/system/users/create')} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none">
            <Plus className="h-4 w-4" />
            Tạo người dùng
          </Button>
        }
      />

      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo họ tên..."
            className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <FilterSelect
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            options={roleFilterOptions}
            className="w-[150px]"
          />
          <FilterSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            options={userStatusFilterOptions}
            className="w-[155px]"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.total}
        onPageChange={(page) => fetchData(page, pagination.pageSize)}
        onPageSizeChange={(size) => {
          setPagination((prev) => ({ ...prev, pageSize: size }));
          fetchData(0, size);
        }}
        emptyMessage="Chưa có người dùng nào"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa người dùng' : 'Tạo người dùng mới'}
        width={700}
        footer={(
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button>
          </>
        )}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Tên đăng nhập" required>
              <FormInput maxLength={50} value={formData.username} onChange={(event) => updateField('username', event.target.value)} />
            </FormField>
            <FormField label={editing ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu'} required={!editing}>
              <FormInput type="password" minLength={6} maxLength={100} value={formData.password} onChange={(event) => updateField('password', event.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Họ tên" required>
              <FormInput maxLength={100} value={formData.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Email">
              <FormInput type="email" maxLength={150} value={formData.email} onChange={(event) => updateField('email', event.target.value)} />
            </FormField>
            <FormField label="Số điện thoại" required={!editing}>
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
              <FormInput maxLength={50} value={formData.militaryRank} onChange={(event) => updateField('militaryRank', event.target.value)} />
            </FormField>
            <FormField label="Đơn vị">
              <FormInput maxLength={100} value={formData.unit} onChange={(event) => updateField('unit', event.target.value)} />
            </FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xóa người dùng"
        description="Bạn có chắc chắn muốn xóa người dùng này không?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
      />

      <ConfirmDialog
        open={!!lockTarget}
        onClose={() => setLockTarget(null)}
        title={lockTarget?.isLocked ? 'Mở khóa người dùng' : 'Khóa người dùng'}
        description={lockTarget?.isLocked ? 'Bạn có muốn mở khóa người dùng này?' : 'Bạn có muốn khóa người dùng này?'}
        onConfirm={handleToggleLock}
        confirmLabel={lockTarget?.isLocked ? 'Mở khóa' : 'Khóa'}
        variant="primary"
      />
    </div>
  );
};

export default UserManagementPage;
