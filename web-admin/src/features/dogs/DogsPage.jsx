import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
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
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

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
  ageMonths: '',
  currentWeightKg: '',
  heightCm: '',
  color: '',
  microchipId: '',
  status: 'ACTIVE',
  notes: '',
};

const roleStatusMap = {
  RETIRED: { label: 'Nghỉ hưu', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25' },
  DECEASED: { label: 'Đã mất', className: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/25' },
  TRANSFERRED: { label: 'Chuyển đơn vị', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25' },
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

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toNullableInteger = (value) => {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
};

const formatLocalDate = (date) => {
  const two = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
};

const ageMonthsToDateOfBirth = (ageMonths) => {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) return null;
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  baseDate.setMonth(baseDate.getMonth() - ageMonths);
  return formatLocalDate(baseDate);
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

  const fetchDogs = async (nextPage = pagination.page, nextPageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const allRows = await fetchAllPages((pageIndex, batchSize) => dogService.getAll(pageIndex, batchSize, search));
      const uniqueList = Array.from(
        new Map(
          allRows.map((dog) => [
            dog.dogId ?? `${dog.dogCode || ''}-${dog.dogName || ''}-${dog.breedId || ''}`,
            dog,
          ])
        ).values()
      );
      const selectedGender = normalizeGenderFilterValue(genderFilter);
      const filteredRows = uniqueList.filter((dog) => {
        if (selectedGender !== 'all' && normalizeGender(dog.gender) !== selectedGender) return false;
        if (statusFilter !== 'all' && dog.status !== statusFilter) return false;
        return true;
      });
      const sortedRows = sortByNewest(filteredRows, { idKeys: ['dogId', 'id'] });
      const { pageRows, totalItems, effectivePage } = paginateRows(sortedRows, nextPage, nextPageSize);
      setDogs(pageRows);
      setPagination((prev) => ({
        ...prev,
        page: effectivePage,
        total: totalItems,
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
  }, [search, genderFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const openDetail = (row) => {
    if (!row?.dogId) return;
    navigate(`/details/DOG_PROFILE/${row.dogId}`);
  };

  const buildPayload = () => {
    const payload = {
      dogName: formData.dogName?.trim() || null,
      breedId: Number(formData.breedId),
      dateOfBirth: ageMonthsToDateOfBirth(toNullableInteger(formData.ageMonths)),
      currentWeightKg: toNullableNumber(formData.currentWeightKg),
      heightCm: toNullableNumber(formData.heightCm),
      color: formData.color?.trim() || null,
      microchipId: formData.microchipId?.trim() || null,
      notes: formData.notes?.trim() || null,
    };

    if (formData.gender) payload.gender = formData.gender;
    if (formData.status) payload.status = formData.status;

    return payload;
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
    if (toNullableInteger(formData.ageMonths) == null) {
      toast.error('Vui lòng nhập tuổi theo tháng');
      return;
    }

    try {
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
        data={dogs}
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.total}
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
            <FormField label="Tên chó" required>
              <FormInput maxLength={100} value={formData.dogName} onChange={(event) => updateField('dogName', event.target.value)} />
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
            <FormField label="Tuổi (tháng)" required>
              <FormInput
                type="number"
                min="0"
                max="240"
                step="1"
                value={formData.ageMonths}
                onChange={(event) => updateField('ageMonths', event.target.value)}
                placeholder="Nhập số tháng tuổi"
              />
            </FormField>
            <FormField label="Trạng thái">
              <FormSelect value={formData.status} onChange={(event) => updateField('status', event.target.value)} options={statusOptions} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Cân nặng (kg)">
              <FormInput type="number" min="0" max="200" step="0.01" value={formData.currentWeightKg} onChange={(event) => updateField('currentWeightKg', event.target.value)} />
            </FormField>
            <FormField label="Chiều cao (cm)">
              <FormInput type="number" min="0" max="200" step="0.01" value={formData.heightCm} onChange={(event) => updateField('heightCm', event.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Màu lông">
              <FormInput maxLength={100} value={formData.color} onChange={(event) => updateField('color', event.target.value)} />
            </FormField>
            <FormField label="Microchip ID">
              <FormInput maxLength={50} value={formData.microchipId} onChange={(event) => updateField('microchipId', event.target.value)} />
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <FormTextarea maxLength={5000} rows={4} value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </FormField>
        </form>
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
