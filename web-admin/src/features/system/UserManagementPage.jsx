import { useEffect, useState } from 'react';
import { Eye, Lock, LockOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import { Modal, FormField, FormInput, FormSelect, Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { userService } from '../../services/userService';
import { cn } from '../../utils/utils';

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

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
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
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 20, total: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [lockTarget, setLockTarget] = useState(null);
  const [formData, setFormData] = useState(defaultForm);

  const fetchData = async (page = 0, size = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await userService.getAll(page, size, search);
      const list = (res.data?.content || []).map((item) => ({ ...item, id: item.userId }));
      setUsers(list);
      setPagination((prev) => ({
        ...prev,
        page,
        total: res.data?.totalElements || 0,
      }));
    } catch (err) {
      toast.error('Lỗi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, pagination.pageSize);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      username: row.username || '',
      password: '',
      fullName: row.fullName || '',
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || '',
      militaryRank: row.militaryRank || '',
      unit: row.unit || '',
    });
    setModalOpen(true);
  };

  const openDetail = async (row) => {
    try {
      const res = await userService.getById(row.userId);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err) {
      toast.error('Không tải được chi tiết người dùng');
    }
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
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.role) {
      toast.error('Vui lòng nhập đủ thông tin bắt buộc');
      return;
    }
    if (!editing && !formData.password.trim()) {
      toast.error('Mật khẩu là bắt buộc khi tạo người dùng');
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
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) {
      toast.error(err?.message || 'Không thể lưu người dùng');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await userService.delete(deleteId);
      toast.success('Xóa người dùng thành công');
      setDeleteId(null);
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) {
      toast.error(err?.message || 'Không thể xóa người dùng');
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
      toast.error(err?.message || 'Không thể thay đổi trạng thái khóa');
    }
  };

  const columns = [
    { key: 'username', header: 'Tên đăng nhập', className: 'w-36', render: (row) => <span className="font-medium text-foreground">{row.username || '—'}</span> },
    { key: 'fullName', header: 'Họ tên', render: (row) => row.fullName || '—' },
    { key: 'email', header: 'Email', className: 'w-52', render: (row) => row.email || '—' },
    { key: 'phone', header: 'Số điện thoại', className: 'w-36', render: (row) => row.phone || '—' },
    { key: 'role', header: 'Vai trò', className: 'w-40', render: (row) => <RoleBadge role={row.role} /> },
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
          <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none">
            <Plus className="h-4 w-4" />
            Tạo người dùng
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
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
              <FormInput value={formData.username} onChange={(event) => updateField('username', event.target.value)} />
            </FormField>
            <FormField label={editing ? 'Mật khẩu mới (tùy chọn)' : 'Mật khẩu'} required={!editing}>
              <FormInput type="password" value={formData.password} onChange={(event) => updateField('password', event.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Họ tên" required>
              <FormInput value={formData.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
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
              <FormInput type="email" value={formData.email} onChange={(event) => updateField('email', event.target.value)} />
            </FormField>
            <FormField label="Số điện thoại">
              <FormInput value={formData.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Quân hàm">
              <FormInput value={formData.militaryRank} onChange={(event) => updateField('militaryRank', event.target.value)} />
            </FormField>
            <FormField label="Đơn vị">
              <FormInput value={formData.unit} onChange={(event) => updateField('unit', event.target.value)} />
            </FormField>
          </div>
        </form>
      </Modal>

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết người dùng" width={700}>
        {detailData && (
          <div className="space-y-3">
            {[
              ['ID', detailData.userId],
              ['Tên đăng nhập', detailData.username],
              ['Họ tên', detailData.fullName],
              ['Vai trò', roleLabelMap[detailData.role] || detailData.role || '—'],
              ['Email', detailData.email || '—'],
              ['Số điện thoại', detailData.phone || '—'],
              ['Quân hàm', detailData.militaryRank || '—'],
              ['Đơn vị', detailData.unit || '—'],
              ['Trạng thái khóa', detailData.isLocked ? 'Đã khóa' : 'Hoạt động'],
              ['Số lần đăng nhập sai', detailData.failedLoginCount ?? '—'],
              ['Đăng nhập gần nhất', formatDateTime(detailData.lastLoginAt)],
              ['Ngày tạo', formatDateTime(detailData.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground">{value || '—'}</span>
              </div>
            ))}
          </div>
        )}
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
