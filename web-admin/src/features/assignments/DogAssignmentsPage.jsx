import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import { Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { dogAssignmentService } from '../../services/dogAssignmentService';
import { dogService } from '../../services/dogService';
import { userService } from '../../services/userService';
import { getAssignmentScopeLabel, getAssignmentTypeLabel } from '../../utils/enumLabels';
import { mapAssignmentErrorToToast } from './assignmentErrorMapper';
import { fetchAllPages } from '../../utils/clientPagination';

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
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${isActive
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25'
        : 'bg-gray-500/10 text-gray-500 dark:text-gray-300 border-gray-500/25'
      }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-gray-500 dark:bg-gray-400'
        }`}
    />
    {isActive ? 'Đang hiệu lực' : 'Đã hủy'}
  </span>
);

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
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const normalizeRows = (rows) =>
    [...rows]
      .filter((row) => row?.assignmentId != null)
      .sort((left, right) => {
        const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();
        const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
        return rightTime - leftTime;
      })
      .map((row) => ({ ...row, id: row.assignmentId }));

  const loadLookups = async () => {
    setLookupLoading(true);
    try {
      const [dogRows, trainerRows] = await Promise.all([
        fetchAllPages((pageIndex, batchSize) => dogService.getAll(pageIndex, batchSize, '')),
        userService.getAllByRole('TRAINER'),
      ]);
      setDogs(Array.isArray(dogRows) ? dogRows : []);
      setTrainers(Array.isArray(trainerRows) ? trainerRows : []);
    } catch (error) {
      toast.error(error, { title: 'Không tải được dữ liệu phân công chó' });
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      let rows = [];

      if (trainerFilter) {
        const response = await dogAssignmentService.getByTrainer(Number(trainerFilter));
        rows = response?.data ?? response ?? [];
      } else if (dogFilter) {
        const response = await dogAssignmentService.getByDog(Number(dogFilter));
        rows = response?.data ?? response ?? [];
      } else if (trainers.length > 0) {
        const responses = await Promise.all(
          trainers.map((trainer) =>
            dogAssignmentService.getByTrainer(trainer.userId).catch(() => ({ data: [] }))
          )
        );
        rows = responses.flatMap((response) => response?.data ?? response ?? []);
      }

      const deduped = Array.from(new Map(rows.map((row) => [row.assignmentId, row])).values());
      setAssignments(normalizeRows(deduped));
    } catch (error) {
      toast.error(error, { title: 'Lỗi tải danh sách phân công' });
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lookupLoading) return;
    fetchAssignments();
  }, [lookupLoading, trainerFilter, dogFilter, trainers]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAssignments = useMemo(() => {
    if (!typeFilter) return assignments;
    return assignments.filter(
      (row) => String(row.assignmentType || '').toUpperCase() === typeFilter.toUpperCase()
    );
  }, [assignments, typeFilter]);

  const pagedAssignments = useMemo(() => {
    const start = pagination.page * pagination.pageSize;
    return filteredAssignments.slice(start, start + pagination.pageSize);
  }, [filteredAssignments, pagination.page, pagination.pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pagination.pageSize));
    if (pagination.page > totalPages - 1) {
      setPagination((prev) => ({ ...prev, page: 0 }));
    }
  }, [filteredAssignments.length, pagination.page, pagination.pageSize]);

  const handleUnassign = async () => {
    if (!deleteTarget) return;
    try {
      await dogAssignmentService.unassign(deleteTarget.assignmentId);
      toast.success('Hủy phân công thành công');
      setDeleteTarget(null);
      await fetchAssignments();
    } catch (error) {
      const mapped = mapAssignmentErrorToToast(error, 'unassign');
      toast.error(mapped);
    }
  };

  const columns = [
    { key: 'dogCode', header: 'Mã chó', className: 'w-28', render: (row) => row.dogCode || '—' },
    {
      key: 'dogName',
      header: 'Chó',
      render: (row) => <span className="font-medium">{row.dogName || '—'}</span>,
    },
    {
      key: 'trainerName',
      header: 'Huấn luyện viên',
      className: 'w-52',
      render: (row) => row.trainerName || '—',
    },
    {
      key: 'specialtyName',
      header: 'Chuyên ngành',
      className: 'w-52',
      render: (row) => row.specialtyName || '—',
    },
    {
      key: 'assignmentType',
      header: 'Loại phân công',
      className: 'w-40 whitespace-nowrap',
      render: (row) => getAssignmentTypeLabel(row.assignmentType),
    },
    {
      key: 'assignmentScope',
      header: 'Phạm vi',
      className: 'w-44 whitespace-nowrap',
      render: (row) => getAssignmentScopeLabel(row.assignmentScope),
    },
    {
      key: 'isActive',
      header: 'Trạng thái',
      className: 'w-36',
      render: (row) => renderStatusBadge(row.isActive),
    },
    {
      key: 'updatedAt',
      header: 'Cập nhật',
      className: 'w-44',
      render: (row) => renderDateTimeCell(row.updatedAt || row.createdAt),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-36',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/details/DOG_ASSIGNMENT/${row.assignmentId}`)} title="Xem chi tiết">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/assignments/${row.assignmentId}/edit`)} title="Sửa">
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
        description="Gán chó cho trainer và tự khởi tạo tiến độ huấn luyện theo chuyên ngành của trainer"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Phân công chó' }]}
        actions={
          <Button
            onClick={() => navigate('/assignments/create')}
            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"
            disabled={lookupLoading}
          >
            <Plus className="h-4 w-4" />
            Tạo phân công
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterSelect
          value={trainerFilter}
          onChange={(value) => {
            setTrainerFilter(value);
            if (value) setDogFilter('');
            setPagination((prev) => ({ ...prev, page: 0 }));
          }}
          placeholder="Tất cả huấn luyện viên"
          options={[
            { value: '', label: 'Tất cả huấn luyện viên' },
            ...trainers.map((trainer) => ({
              value: String(trainer.userId),
              label: `${trainer.fullName} (${trainer.specialtyName || 'Chưa có chuyên ngành'})`,
            })),
          ]}
          buttonClassName="min-w-[210px]"
        />

        <FilterSelect
          value={dogFilter}
          onChange={(value) => {
            setDogFilter(value);
            if (value) setTrainerFilter('');
            setPagination((prev) => ({ ...prev, page: 0 }));
          }}
          placeholder="Tất cả chó"
          options={[
            { value: '', label: 'Tất cả chó' },
            ...dogs.map((dog) => ({
              value: String(dog.dogId),
              label: `${dog.dogCode || '---'} - ${dog.dogName || 'Không tên'}`,
            })),
          ]}
          buttonClassName="min-w-[160px]"
        />

        <FilterSelect
          value={typeFilter}
          onChange={(value) => {
            setTypeFilter(value);
            setPagination((prev) => ({ ...prev, page: 0 }));
          }}
          placeholder="Tất cả loại phân công"
          options={[
            { value: '', label: 'Tất cả loại phân công' },
            { value: 'PRIMARY', label: 'Chính' },
            { value: 'TEMPORARY', label: 'Tạm thời' },
          ]}
          buttonClassName="min-w-[200px]"
        />
      </div>

      <DataTable
        columns={columns}
        data={pagedAssignments}
        loading={loading || lookupLoading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={filteredAssignments.length}
        onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
        onPageSizeChange={(nextSize) => setPagination({ page: 0, pageSize: nextSize })}
        emptyMessage="Chưa có phân công nào"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
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
