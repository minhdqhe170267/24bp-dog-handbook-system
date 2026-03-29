import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { EditForm } from '../../components/shared/DetailModal';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import { Plus, Eye, Pencil, Trash2, Search, Send, Globe, Undo2, History } from 'lucide-react';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/FormComponents';
import { sortByNewest } from '../../utils/sortByNewest';

const sizeLabels = { SMALL: 'Nhỏ', MEDIUM: 'Trung bình', LARGE: 'Lớn', GIANT: 'Khổng lồ' };
const trainLabels = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', VERY_HIGH: 'Rất cao' };

const sizeOptions = [
  { value: 'all', label: 'Tất cả kích thước' },
  { value: 'SMALL', label: 'Nhỏ' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'LARGE', label: 'Lớn' },
  { value: 'GIANT', label: 'Khổng lồ' },
];
const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const editFields = [
  { key: 'breedName', label: 'Tên giống', required: true },
  { key: 'origin', label: 'Nguồn gốc' },
  { key: 'sizeClassification', label: 'Kích thước', type: 'select', options: [{ value: 'SMALL', label: 'Nhỏ' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'LARGE', label: 'Lớn' }, { value: 'GIANT', label: 'Khổng lồ' }] },
  { key: 'trainabilityLevel', label: 'Khả năng huấn luyện', type: 'select', options: [{ value: 'LOW', label: 'Thấp' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'HIGH', label: 'Cao' }, { value: 'VERY_HIGH', label: 'Rất cao' }] },
  { key: 'lifespanYears', label: 'Tuổi thọ' },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'operationalCapabilities', label: 'Khả năng tác chiến', type: 'textarea' },
];

const BreedsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyTarget, setHistoryTarget] = useState({ title: '', typeLabel: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canPublish = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';

  const toBreedPayload = (formData) => ({
    breedName: formData.breedName?.trim() || '',
    origin: formData.origin?.trim() || '',
    sizeClassification: formData.sizeClassification || '',
    trainabilityLevel: formData.trainabilityLevel || '',
    lifespanYears: formData.lifespanYears?.trim() || '',
    description: formData.description?.trim() || '',
    operationalCapabilities: formData.operationalCapabilities?.trim() || '',
  });

  const fetchData = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true);
    try {
      const batchSize = 200;
      let pageIndex = 0;
      let totalPages = 1;
      const allRows = [];

      while (pageIndex < totalPages) {
        const params = new URLSearchParams();
        params.append('page', String(pageIndex));
        params.append('size', String(batchSize));
        if (search) params.append('search', search);

        const res = await api.get(`/breeds?${params.toString()}`);
        const data = res?.data || res || {};
        const pageRows = Array.isArray(data.content) ? data.content : [];
        allRows.push(...pageRows);

        totalPages = Number.isFinite(data.totalPages) ? data.totalPages : pageRows.length > 0 ? pageIndex + 2 : pageIndex + 1;
        if (pageRows.length === 0) break;
        pageIndex += 1;
      }

      let list = allRows;
      if (sizeFilter !== 'all') list = list.filter((b) => b.sizeClassification === sizeFilter);
      if (statusFilter !== 'all') list = list.filter((b) => b.status === statusFilter);

      const sorted = sortByNewest(list, {
        timeKeys: ['updatedAt', 'updated_at', 'createdAt', 'created_at'],
        idKeys: ['breedId', 'id'],
      });

      const safeTotal = sorted.length;
      const maxPage = safeTotal > 0 ? Math.floor((safeTotal - 1) / nextPageSize) : 0;
      const effectivePage = Math.min(nextPage, maxPage);
      const start = effectivePage * nextPageSize;
      const paged = sorted.slice(start, start + nextPageSize);

      setItems(paged);
      setTotalItems(safeTotal);
      if (effectivePage !== nextPage) setPage(effectivePage);
    } catch (err) {
      console.error('Fetch breeds error:', err);
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page, pageSize); }, [page, pageSize, search, sizeFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/breeds/${deleteId}`);
      toast.success('Đã xóa giống chó');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err, { title: 'Không thể xóa giống chó' });
    } finally {
      setDeleting(false);
    }
  };

  const getBreedId = (row) => row.breedId || row.id;
  const getStatus = (row) => String(row.status || '').toUpperCase();
  const canShowEdit = (row) => canEdit && !['PENDING', 'APPROVED', 'PUBLISHED'].includes(getStatus(row));

  const handleSubmitForReview = async (row) => {
    const id = getBreedId(row);
    if (!id) return;
    try {
      await approvalService.submit(APPROVAL_ENTITY_TYPES.DOG_BREED, id);
      setPage(0);
      await fetchData(0, pageSize);
    } catch (err) {
      console.error('Submit breed for review error:', err);
      toast.error(err, { title: 'Không thể gửi duyệt giống chó' });
    }
  };

  const handlePublish = async (row) => {
    const id = getBreedId(row);
    if (!id) return;
    try {
      await approvalService.publish(APPROVAL_ENTITY_TYPES.DOG_BREED, id);
      setPage(0);
      await fetchData(0, pageSize);
    } catch (err) {
      console.error('Publish breed error:', err);
      toast.error(err, { title: 'Không thể xuất bản giống chó' });
    }
  };

  const handleUnpublish = async (row) => {
    const id = getBreedId(row);
    if (!id) return;
    try {
      await approvalService.unpublish(APPROVAL_ENTITY_TYPES.DOG_BREED, id);
      setPage(0);
      await fetchData(0, pageSize);
    } catch (err) {
      console.error('Unpublish breed error:', err);
      toast.error(err, { title: 'Không thể gỡ xuất bản giống chó' });
    }
  };

  const openHistory = async (row) => {
    const id = getBreedId(row);
    if (!id) return;

    setHistoryTarget({ title: row?.breedName || '-', typeLabel: 'Giống chó' });
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      const res = await approvalService.getHistory(APPROVAL_ENTITY_TYPES.DOG_BREED, id);
      const payload = res?.data || res || [];
      setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
    } catch (err) {
      console.error('Fetch breed approval history error:', err);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = async (formData) => {
    setSaving(true);
    try {
      await api.put(`/breeds/${editItem.breedId}`, toBreedPayload(formData));
      setEditItem(null);
      fetchData();
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err, { title: 'Không thể cập nhật giống chó' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      await api.post('/breeds', toBreedPayload(formData));
      setCreateOpen(false);
      setPage(0);
      await fetchData(0, pageSize);
    } catch (err) {
      console.error('Create error:', err);
      toast.error(err, { title: 'Không thể tạo giống chó mới' });
    } finally {
      setSaving(false);
    }
  };

  const getDateTimeParts = (value) => {
    if (!value) return null;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return { time: value, date: '' };
    const twoDigits = (num) => String(num).padStart(2, '0');
    return {
      time: `${twoDigits(dt.getHours())}:${twoDigits(dt.getMinutes())}:${twoDigits(dt.getSeconds())}`,
      date: `${twoDigits(dt.getDate())}/${twoDigits(dt.getMonth() + 1)}/${dt.getFullYear()}`,
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

  const columns = [
    { key: 'breedName', header: 'Tên giống', render: (r) => <span className="font-medium">{r.breedName || '-'}</span> },
    { key: 'origin', header: 'Nguồn gốc', render: (r) => r.origin || '-' },
    { key: 'sizeClassification', header: 'Kích thước', render: (r) => sizeLabels[r.sizeClassification] || r.sizeClassification || '-' },
    { key: 'trainabilityLevel', header: 'Khả năng huấn luyện', render: (r) => trainLabels[r.trainabilityLevel] || r.trainabilityLevel || '-' },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'updatedAt', header: 'Cập nhật', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
    {
      key: 'actions', header: 'Thao tác', render: (r) => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => navigate(`/details/DOG_BREED/${getBreedId(r)}`)}><Eye className="h-4 w-4" /></button>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Lịch sử duyệt" onClick={() => openHistory(r)}><History className="h-4 w-4 text-muted-foreground" /></button>
          {canShowEdit(r) && <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Sửa" onClick={() => navigate(`/breeds/${getBreedId(r)}/edit`)}><Pencil className="h-4 w-4" /></button>}
          {canDelete && getStatus(r) === 'DRAFT' && <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xóa" onClick={() => setDeleteId(getBreedId(r))}><Trash2 className="h-4 w-4 text-destructive" /></button>}
          {canEdit && ['DRAFT', 'REJECTED'].includes(getStatus(r)) && (
            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Gửi duyệt" onClick={() => handleSubmitForReview(r)}>
              <Send className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            </button>
          )}
          {canPublish && getStatus(r) === 'APPROVED' && (
            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xuất bản" onClick={() => handlePublish(r)}>
              <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            </button>
          )}
          {canPublish && getStatus(r) === 'PUBLISHED' && (
            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Gỡ xuất bản" onClick={() => handleUnpublish(r)}>
              <Undo2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dữ liệu Giống chó" description="Quản lý thông tin các giống chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Giống chó' }]}
        actions={canEdit ? <button onClick={() => navigate('/breeds/create')} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"><Plus className="h-4 w-4" />Tạo giống chó</button> : null} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm theo tên giống chó..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors w-64" />
        </div>
        <FilterSelect value={sizeFilter} onChange={(v) => { setSizeFilter(v); setPage(0); }} options={sizeOptions} placeholder="Tất cả kích thước" />
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả trạng thái" />
      </div>

      {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
        <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
          onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có giống chó nào" />
      )}

      {/* Edit Modal */}
      <DetailModal open={!!editItem} onClose={() => setEditItem(null)} title="Sửa giống chó" size="lg">
        <EditForm fields={editFields} data={editItem} onSubmit={handleEdit} onCancel={() => setEditItem(null)} loading={saving} />
      </DetailModal>

      <DetailModal open={createOpen} onClose={() => setCreateOpen(false)} title="Thêm giống chó" size="lg">
        <EditForm fields={editFields} data={{}} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={saving} />
      </DetailModal>

      <ApprovalHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        loading={historyLoading}
        records={historyRecords}
        entityTitle={historyTarget.title}
        entityTypeLabel={historyTarget.typeLabel}
      />
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xóa giống chó"
        description="Bạn có chắc chắn muốn xóa giống chó này?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        loading={deleting}
      />
    </div>
  );
};

export default BreedsPage;


