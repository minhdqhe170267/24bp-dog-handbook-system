import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import EntityMediaPreview from '../../components/shared/EntityMediaPreview';
import {
  Button,
  ConfirmDialog,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  Modal,
} from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { dogService } from '../../services/dogService';
import { breedService } from '../../services/breedService';
import { getStatusLabel } from '../../utils/enumLabels';
import { sortByNewest } from '../../utils/sortByNewest';

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

const genderFilterOptions = [
  { value: 'all', label: 'Tất cả giới tính' },
  { value: 'MALE', label: 'Đực' },
  { value: 'FEMALE', label: 'Cái' },
];

const statusFilterOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  ...statusOptions,
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
  imageUrl: '',
  notes: '',
};

const roleStatusMap = {
  RETIRED: { label: 'Nghỉ hưu', className: 'bg-amber-500/10 text-amber-600 border-amber-500/25' },
  DECEASED: { label: 'Đã mất', className: 'bg-red-500/10 text-red-600 border-red-500/25' },
  TRANSFERRED: { label: 'Chuyển đơn vị', className: 'bg-blue-500/10 text-blue-600 border-blue-500/25' },
};

const normalizeGender = (value) => {
  if (!value) return '';
  const raw = String(value).trim().toUpperCase();
  if (raw === 'FEMALE' || raw === 'CAI' || raw === 'CÁI') return 'FEMALE';
  if (raw === 'MALE' || raw === 'DUC' || raw === 'ĐỰC') return 'MALE';
  return raw;
};

const normalizeGenderFilterValue = (value) => {
  if (value === 'all') return 'all';
  const normalized = normalizeGender(value);
  return normalized === 'MALE' || normalized === 'FEMALE' ? normalized : 'all';
};

const getGenderLabel = (value) => (normalizeGender(value) === 'FEMALE' ? 'Cái' : 'Đực');

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : '';
  }
  const two = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
};

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getDateTimeParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: value, date: '' };
  const two = (num) => String(num).padStart(2, '0');
  return {
    time: `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`,
    date: `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}`,
  };
};

const DogsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [dogs, setDogs] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);

  const fetchBreeds = async () => {
    try {
      const res = await breedService.getAll(0, 200, '');
      setBreeds(res.data?.content || []);
    } catch (error) {
      toast.error(error, { title: 'Không tải được danh sách giống chó' });
    }
  };

  const fetchDogs = async (page = 0, size = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await dogService.getAll(page, size, search);
      const rawList = res.data?.content || [];
      const uniqueList = Array.from(
        new Map(
          rawList.map((dog) => [
            dog.dogId ?? `${dog.dogCode || ''}-${dog.dogName || ''}-${dog.breedId || ''}`,
            dog,
          ])
        ).values()
      );
      setDogs(sortByNewest(uniqueList, { idKeys: ['dogId', 'id'] }));
      setPagination((prev) => ({
        ...prev,
        page,
        total: res.data?.totalElements || 0,
      }));
    } catch (error) {
      toast.error(error, { title: 'Lỗi tải danh sách chó' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreeds();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDogs(0, pagination.pageSize);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (!row?.dogId) return;
    navigate(`/dogs/${row.dogId}/edit`);
  };

  const openDetail = async (row) => {
    try {
      const res = await dogService.getById(row.dogId);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error(error, { title: 'Không tải được chi tiết chó' });
    }
  };

  const buildPayload = () => {
    const payload = {
      dogName: formData.dogName?.trim() || null,
      breedId: Number(formData.breedId),
      dateOfBirth: formData.dateOfBirth || null,
      currentWeightKg: toNullableNumber(formData.currentWeightKg),
      heightCm: toNullableNumber(formData.heightCm),
      color: formData.color?.trim() || null,
      microchipId: formData.microchipId?.trim() || null,
      imageUrl: formData.imageUrl?.trim() || null,
      notes: formData.notes?.trim() || null,
    };

    if (formData.gender) payload.gender = formData.gender;
    if (formData.status) payload.status = formData.status;

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.breedId) {
      toast.error('Vui lòng chọn giống chó');
      return;
    }

    try {
      const isCreate = !editing;
      const payload = buildPayload();
      if (editing) {
        await dogService.update(editing.dogId, payload);
        toast.success('Cập nhật hồ sơ chó thành công');
      } else {
        await dogService.create(payload);
        toast.success('Tạo hồ sơ chó thành công');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData(defaultForm);
      setPagination((prev) => ({ ...prev, page: 0 }));
      await fetchDogs(0, pagination.pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu thông tin chó' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dogService.delete(deleteId);
      toast.success('Đã xóa hồ sơ chó');
      setDeleteId(null);
      fetchDogs(pagination.page, pagination.pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể xóa hồ sơ chó' });
    }
  };

  const renderDogStatus = (status) => {
    if (roleStatusMap[status]) {
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${roleStatusMap[status].className}`}>
          {roleStatusMap[status].label}
        </span>
      );
    }
    return <StatusBadge status={status} />;
  };

  const renderDateTimeCell = (value) => {
    const parts = getDateTimeParts(value);
    if (!parts) return '—';
    return (
      <div className="leading-tight">
        <div className="text-sm font-medium text-foreground">{parts.time}</div>
        <div className="text-xs text-muted-foreground">{parts.date}</div>
      </div>
    );
  };

  const columns = [
    { key: 'dogCode', header: 'Mã chó', className: 'w-28', render: (row) => row.dogCode || '—' },
    { key: 'dogName', header: 'Tên chó', render: (row) => <span className="font-medium">{row.dogName || '—'}</span> },
    { key: 'breedName', header: 'Giống chó', className: 'w-56', render: (row) => row.breedName || '—' },
    { key: 'gender', header: 'Giới tính', className: 'w-28', render: (row) => getGenderLabel(row.gender) },
    { key: 'status', header: 'Trạng thái', className: 'w-36', render: (row) => renderDogStatus(row.status) },
    {
      key: 'currentWeightKg',
      header: 'Cân nặng',
      className: 'w-28',
      render: (row) => (row.currentWeightKg == null ? '—' : `${row.currentWeightKg} kg`),
    },
    { key: 'updatedAt', header: 'Cập nhật', className: 'w-44', render: (row) => renderDateTimeCell(row.updatedAt || row.createdAt) },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-40',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(row)} title="Xem chi tiết">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.dogId)} title="Xóa">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredDogs = useMemo(() => {
    const selectedGender = normalizeGenderFilterValue(genderFilter);
    return dogs.filter((dog) => {
      if (selectedGender !== 'all' && normalizeGender(dog.gender) !== selectedGender) return false;
      if (statusFilter !== 'all' && dog.status !== statusFilter) return false;
      return true;
    });
  }, [dogs, genderFilter, statusFilter]);

  const hasClientFilter = genderFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Hồ sơ chó"
        description="Quản lý hồ sơ từng chó nghiệp vụ trong hệ thống"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Hồ sơ chó' }]}
        actions={(
          <Button onClick={() => navigate('/dogs/create')} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none">
            <Plus className="h-4 w-4" />
            Tạo hồ sơ chó
          </Button>
        )}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên chó..."
            className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect
            value={genderFilter}
            onChange={(value) => {
              setGenderFilter(normalizeGenderFilterValue(value));
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            options={genderFilterOptions}
            className="w-[150px]"
          />
          <FilterSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            options={statusFilterOptions}
            className="w-[168px]"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredDogs}
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={hasClientFilter ? filteredDogs.length : pagination.total}
        onPageChange={(page) => fetchDogs(page, pagination.pageSize)}
        onPageSizeChange={(size) => {
          setPagination((prev) => ({ ...prev, pageSize: size }));
          fetchDogs(0, size);
        }}
        emptyMessage="Chưa có hồ sơ chó nào"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa hồ sơ chó' : 'Tạo hồ sơ chó'}
        width={760}
        footer={(
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button>
          </>
        )}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Tên chó">
              <FormInput value={formData.dogName} onChange={(event) => updateField('dogName', event.target.value)} />
            </FormField>
            <FormField label="Giống chó" required>
              <FormSelect
                value={formData.breedId}
                onChange={(event) => updateField('breedId', event.target.value)}
                placeholder="Chọn giống chó"
                options={breeds.map((breed) => ({ value: breed.breedId, label: breed.breedName }))}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Giới tính">
              <FormSelect value={formData.gender} onChange={(event) => updateField('gender', event.target.value)} options={genderOptions} />
            </FormField>
            <FormField label="Ngày sinh">
              <FormInput type="date" value={formData.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} />
            </FormField>
            <FormField label="Trạng thái">
              <FormSelect value={formData.status} onChange={(event) => updateField('status', event.target.value)} options={statusOptions} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Cân nặng (kg)">
              <FormInput type="number" min="0" step="0.01" value={formData.currentWeightKg} onChange={(event) => updateField('currentWeightKg', event.target.value)} />
            </FormField>
            <FormField label="Chiều cao (cm)">
              <FormInput type="number" min="0" step="0.01" value={formData.heightCm} onChange={(event) => updateField('heightCm', event.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Màu lông">
              <FormInput value={formData.color} onChange={(event) => updateField('color', event.target.value)} />
            </FormField>
            <FormField label="Microchip ID">
              <FormInput value={formData.microchipId} onChange={(event) => updateField('microchipId', event.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
            <FormField label="Ảnh (URL)">
              <FormInput value={formData.imageUrl} onChange={(event) => updateField('imageUrl', event.target.value)} />
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <FormTextarea rows={4} value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Chi tiết hồ sơ chó"
        width={760}
      >
        {detailData && (
          <div className="space-y-3">
            {[
              ['Mã chó', detailData.dogCode],
              ['Tên chó', detailData.dogName],
              ['Giống chó', detailData.breedName],
              ['Giới tính', getGenderLabel(detailData.gender)],
              ['Ngày sinh', detailData.dateOfBirth || '—'],
              ['Tuổi (tháng)', detailData.ageMonths ?? '—'],
              ['Cân nặng', detailData.currentWeightKg == null ? '—' : `${detailData.currentWeightKg} kg`],
              ['Chiều cao', detailData.heightCm == null ? '—' : `${detailData.heightCm} cm`],
              ['Màu lông', detailData.color || '—'],
              ['Microchip ID', detailData.microchipId || '—'],
              ['Trạng thái', getStatusLabel(detailData.status)],
              ['Ảnh', detailData.imageUrl || '—'],
              ['Ngày tạo', detailData.createdAt || '—'],
              ['Cập nhật', detailData.updatedAt || '—'],
              ['Ghi chú', detailData.notes || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-44 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground break-all">{value || '—'}</span>
              </div>
            ))}
            <EntityMediaPreview entityType="DOG_PROFILE" entityId={detailData?.dogId} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xóa hồ sơ chó"
        description="Bạn có chắc chắn muốn xóa hồ sơ chó này không?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
      />
    </div>
  );
};

export default DogsPage;
