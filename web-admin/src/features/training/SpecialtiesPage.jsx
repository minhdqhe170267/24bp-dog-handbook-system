import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import StatusBadge from '../../components/shared/StatusBadge';
import { Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import trainingSpecialtyService from '../../services/trainingSpecialtyService';
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
];

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

const SpecialtiesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    try {
      const allRows = await fetchAllPages((pageIndex, batchSize) =>
        trainingSpecialtyService.getAll(pageIndex, batchSize, search)
      );
      const normalizedSearch = search.trim().toLowerCase();
      const filteredRows = allRows.filter((item) => {
        const status = item?.isActive === false ? 'INACTIVE' : 'ACTIVE';
        const matchesSearch =
          !normalizedSearch ||
          String(item?.specialtyName || '').toLowerCase().includes(normalizedSearch) ||
          String(item?.specialtyCode || '').toLowerCase().includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const sortedRows = sortByNewest(filteredRows, { idKeys: ['specialtyId', 'id'] });
      const { pageRows, totalItems: nextTotalItems, effectivePage } = paginateRows(
        sortedRows,
        nextPage,
        nextPageSize
      );

      setItems(pageRows);
      setTotalItems(nextTotalItems);
      if (effectivePage !== nextPage) {
        setPage(effectivePage);
      }
    } catch (error) {
      toast.error(error, { title: 'Không tải được danh sách chuyên ngành' });
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, pageSize);
  }, [page, pageSize, search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await trainingSpecialtyService.delete(deleteTarget.specialtyId);
      toast.success('Xóa chuyên ngành thành công');
      setDeleteTarget(null);
      await fetchData(0, pageSize);
      setPage(0);
    } catch (error) {
      toast.error(error, { title: 'Không thể xóa chuyên ngành' });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'specialtyCode',
      header: 'Mã',
      className: 'w-36',
      headerClassName: 'whitespace-nowrap',
      render: (row) => <span className="font-medium">{row.specialtyCode || '—'}</span>,
    },
    {
      key: 'specialtyName',
      header: 'Tên chuyên ngành',
      headerClassName: 'whitespace-nowrap',
      render: (row) => row.specialtyName || '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'w-32',
      headerClassName: 'whitespace-nowrap',
      render: (row) => <StatusBadge status={row.isActive === false ? 'INACTIVE' : 'ACTIVE'} />,
    },
    {
      key: 'updatedAt',
      header: 'Cập nhật',
      className: 'w-36',
      headerClassName: 'whitespace-nowrap',
      render: (row) => renderDateTimeCell(row.updatedAt || row.createdAt),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-auto',
      headerClassName: 'whitespace-nowrap',
      render: (row) => (
        <div className="flex items-center gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/details/TRAINING_SPECIALTY/${row.specialtyId}`)}
            title="Xem chi tiết"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/training/specialties/${row.specialtyId}/edit`)}
            title="Sửa"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row)}
            title="Xóa"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Chuyên ngành huấn luyện"
        description="Quản lý thư viện chuyên ngành dùng chung cho trainer và lộ trình"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Huấn luyện' },
          { label: 'Chuyên ngành' },
        ]}
        actions={
          <Button
            onClick={() => navigate('/training/specialties/create')}
            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"
          >
            <Plus className="h-4 w-4" />
            Tạo chuyên ngành
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Tìm theo mã hoặc tên chuyên ngành..."
            className="h-9 w-full pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
          />
        </div>
        <FilterSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
          options={statusOptions}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(nextSize) => {
          setPage(0);
          setPageSize(nextSize);
        }}
        emptyMessage="Chưa có chuyên ngành nào"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xóa chuyên ngành"
        description="Bạn có chắc chắn muốn xóa chuyên ngành này không?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        loading={deleting}
      />
    </div>
  );
};

export default SpecialtiesPage;
