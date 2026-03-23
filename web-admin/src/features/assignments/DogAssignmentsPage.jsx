import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import {
  Button,
  ConfirmDialog,
  FormField,
  FormSelect,
  FormTextarea,
  Modal,
} from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { dogAssignmentService } from '../../services/dogAssignmentService';
import { dogService } from '../../services/dogService';
import { userService } from '../../services/userService';
import { getAssignmentTypeLabel } from '../../utils/enumLabels';

const assignmentTypeOptions = [
  { value: 'PRIMARY', label: 'Chính' },
  { value: 'SECONDARY', label: 'Phụ' },
  { value: 'TEMPORARY', label: 'Tạm thời' },
];

const defaultForm = {
  dogId: '',
  trainerId: '',
  assignmentType: 'PRIMARY',
  startDate: '',
  endDate: '',
  notes: '',
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

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const two = (num) => String(num).padStart(2, '0');
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const DogAssignmentsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);

  const [dogs, setDogs] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const [trainerFilter, setTrainerFilter] = useState('');
  const [dogFilter, setDogFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(defaultForm);

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const getSortableTime = (row) => {
    const value = row?.updatedAt || row?.createdAt || null;
    const time = new Date(value || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const normalizeRows = (rows) =>
    [...rows]
      .sort((left, right) => {
        const timeDiff = getSortableTime(right) - getSortableTime(left);
        if (timeDiff !== 0) return timeDiff;
        const rightId = Number(right?.assignmentId || 0);
        const leftId = Number(left?.assignmentId || 0);
        return rightId - leftId;
      })
      .filter((row) => row?.assignmentId != null)
      .map((row) => ({ ...row, id: row.assignmentId }));

  const fetchLookups = async () => {
    setLookupLoading(true);
    try {
      const [dogsRes, trainerList] = await Promise.all([
        dogService.getAll(0, 200, ''),
        userService.getAllByRole('TRAINER'),
      ]);

      const dogList = dogsRes.data?.content || [];

      setDogs(dogList);
      setTrainers(trainerList || []);
    } catch (error) {
      toast.error(error, { title: 'Không tải được dữ liệu danh mục cho phân công' });
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      let rows = [];

      if (trainerFilter) {
        const res = await dogAssignmentService.getByTrainer(Number(trainerFilter));
        rows = res.data || [];
      } else if (dogFilter) {
        const res = await dogAssignmentService.getByDog(Number(dogFilter));
        rows = res.data || [];
      } else if (trainers.length > 0) {
        const responses = await Promise.all(
          trainers.map((trainer) =>
            dogAssignmentService.getByTrainer(trainer.userId).catch(() => ({ data: [] })),
          ),
        );
        rows = responses.flatMap((res) => res.data || []);
      }

      const deduped = Array.from(
        new Map(rows.map((row) => [row.assignmentId, row])).values(),
      );
      setAssignments(normalizeRows(deduped));
    } catch (error) {
      toast.error(error, { title: 'Lỗi tải danh sách phân công' });
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lookupLoading) return;
    fetchAssignments();
  }, [trainerFilter, dogFilter, trainers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(assignments.length / pagination.pageSize));
    if (pagination.page > totalPages - 1) {
      setPagination((prev) => ({ ...prev, page: 0 }));
    }
  }, [assignments, pagination.page, pagination.pageSize]);

  const pagedAssignments = useMemo(() => {
    const start = pagination.page * pagination.pageSize;
    return assignments.slice(start, start + pagination.pageSize);
  }, [assignments, pagination.page, pagination.pageSize]);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      ...defaultForm,
      dogId: dogFilter || '',
      trainerId: trainerFilter || '',
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (!row?.assignmentId) return;
    navigate(`/assignments/${row.assignmentId}/edit`);
  };

  const openDetail = async (row) => {
    try {
      const res = await dogAssignmentService.getById(row.assignmentId);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (error) {
      toast.error(error, { title: 'Không tải được chi tiết phân công' });
    }
  };

  const buildPayload = () => ({
    dogId: Number(formData.dogId),
    trainerId: Number(formData.trainerId),
    assignmentType: formData.assignmentType || 'PRIMARY',
    startDate: formData.startDate,
    endDate: formData.endDate || null,
    notes: formData.notes?.trim() || null,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.dogId || !formData.trainerId || !formData.startDate) {
      toast.error('Vui lòng nhập đủ thông tin bắt buộc');
      return;
    }
    const selectedTrainer = trainers.find(
      (trainer) => String(trainer?.userId) === String(formData.trainerId),
    );
    if (!selectedTrainer || String(selectedTrainer?.role || '').toUpperCase() !== 'TRAINER') {
      toast.error('Chỉ có thể phân công cho người dùng có vai trò Huấn luyện viên');
      return;
    }

    try {
      const isCreate = !editing;
      const payload = buildPayload();
      if (editing) {
        await dogAssignmentService.update(editing.assignmentId, payload);
        toast.success('Cập nhật phân công thành công');
      } else {
        await dogAssignmentService.assign(payload);
        toast.success('Phân công chó thành công');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData(defaultForm);
      setPagination((prev) => ({ ...prev, page: 0 }));
      await fetchAssignments();
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu phân công' });
    }
  };

  const handleUnassign = async () => {
    if (!deleteTarget) return;
    try {
      await dogAssignmentService.unassign(deleteTarget.assignmentId);
      toast.success('Hủy phân công thành công');
      setDeleteTarget(null);
      fetchAssignments();
    } catch (error) {
      toast.error(error, { title: 'Không thể hủy phân công' });
    }
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

  const renderStatusBadge = (isActive) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
          : 'bg-gray-500/10 text-gray-500 border-gray-500/25'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
          isActive ? 'bg-emerald-500' : 'bg-gray-500'
        }`}
      />
      {isActive ? 'Đang hiệu lực' : 'Đã hủy'}
    </span>
  );

  const columns = [
    { key: 'dogCode', header: 'Mã chó', className: 'w-28', render: (row) => row.dogCode || '—' },
    { key: 'dogName', header: 'Chó', render: (row) => <span className="font-medium">{row.dogName || '—'}</span> },
    { key: 'trainerName', header: 'Huấn luyện viên', className: 'w-56', render: (row) => row.trainerName || '—' },
    {
      key: 'assignmentType',
      header: 'Loại phân công',
      className: 'w-40 whitespace-nowrap',
      render: (row) => {
        const labels = { PRIMARY: 'Chính', SECONDARY: 'Phụ', TEMPORARY: 'Tạm thời' };
        return labels[row.assignmentType] || row.assignmentType || '—';
      },
    },
    {
      key: 'isActive',
      header: 'Trạng thái',
      className: 'w-36',
      render: (row) => renderStatusBadge(row.isActive),
    },
    { key: 'updatedAt', header: 'Cập nhật', className: 'w-44', render: (row) => renderDateTimeCell(row.updatedAt || row.createdAt) },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-36',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(row)} title="Xem chi tiết">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)} title="Ngừng hiệu lực">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Phân công chó cho trainer"
        description="Gán chó nghiệp vụ cho huấn luyện viên theo đợt công tác"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Phân công chó' }]}
        actions={(
          <Button onClick={() => navigate('/assignments/create')} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none" disabled={lookupLoading}>
            <Plus className="h-4 w-4" />
            Tạo phân công
          </Button>
        )}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterSelect
          value={trainerFilter}
          onChange={(value) => {
            setTrainerFilter(value);
            if (value) setDogFilter('');
            setPagination((prev) => ({ ...prev, page: 0 }));
          }}
          placeholder="Huấn luyện viên"
          options={[
            { value: '', label: 'Huấn luyện viên' },
            ...trainers.map((trainer) => ({
              value: String(trainer.userId),
              label: `${trainer.fullName} (${trainer.username})`,
            })),
          ]}
          className="w-72"
        />

        <FilterSelect
          value={dogFilter}
          onChange={(value) => {
            setDogFilter(value);
            if (value) setTrainerFilter('');
            setPagination((prev) => ({ ...prev, page: 0 }));
          }}
          placeholder="Chó"
          options={[
            { value: '', label: 'Chó' },
            ...dogs.map((dog) => ({
              value: String(dog.dogId),
              label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}`,
            })),
          ]}
          className="w-72"
        />
      </div>

      <DataTable
        columns={columns}
        data={pagedAssignments}
        loading={loading || lookupLoading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={assignments.length}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onPageSizeChange={(pageSize) => setPagination({ page: 0, pageSize })}
        emptyMessage="Chưa có phân công nào"
      />

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Chi tiết phân công chó"
        width={700}
      >
        {detailData && (
          <div className="space-y-3">
            {[
              ['Mã phân công', detailData.assignmentId],
              ['Chó', `${detailData.dogCode || '---'} - ${detailData.dogName || '—'}`],
              ['Huấn luyện viên', `${detailData.trainerName || '—'} (${detailData.trainerUsername || '—'})`],
              ['Loại phân công', getAssignmentTypeLabel(detailData.assignmentType)],
              ['Ngày bắt đầu', formatDate(detailData.startDate)],
              ['Ngày kết thúc', formatDate(detailData.endDate)],
              ['Trạng thái', detailData.isActive ? 'Đang hiệu lực' : 'Đã hủy'],
              ['Ngày tạo', detailData.createdAt || '—'],
              ['Cập nhật', detailData.updatedAt || '—'],
              ['Ghi chú', detailData.notes || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground">{value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa phân công' : 'Tạo phân công mới'}
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
            <FormField label="Chó" required>
              <FormSelect
                value={formData.dogId}
                onChange={(event) => updateField('dogId', event.target.value)}
                placeholder="Chọn chó"
                options={dogs.map((dog) => ({ value: dog.dogId, label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}` }))}
              />
            </FormField>
            <FormField label="Huấn luyện viên" required>
              <FormSelect
                value={formData.trainerId}
                onChange={(event) => updateField('trainerId', event.target.value)}
                placeholder="Chọn huấn luyện viên"
                options={trainers.map((trainer) => ({ value: trainer.userId, label: `${trainer.fullName} (${trainer.username})` }))}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Loại phân công">
              <FormSelect value={formData.assignmentType} onChange={(event) => updateField('assignmentType', event.target.value)} options={assignmentTypeOptions} />
            </FormField>
            <FormField label="Ngày bắt đầu" required>
              <input
                type="date"
                value={formData.startDate}
                onChange={(event) => updateField('startDate', event.target.value)}
                className="w-full h-10 px-3 border border-input rounded-lg text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all bg-card"
              />
            </FormField>
            <FormField label="Ngày kết thúc">
              <input
                type="date"
                value={formData.endDate}
                onChange={(event) => updateField('endDate', event.target.value)}
                className="w-full h-10 px-3 border border-input rounded-lg text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all bg-card"
              />
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <FormTextarea rows={4} value={formData.notes} onChange={(event) => updateField('notes', event.target.value)} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Hủy phân công chó"
        description="Bạn có chắc chắn muốn hủy phân công này không?"
        onConfirm={handleUnassign}
        confirmLabel="Hủy phân công"
      />
    </div>
  );
};

export default DogAssignmentsPage;
