import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView, EditForm } from '../../components/shared/DetailModal';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import { Plus, Eye, Pencil, EyeOff, Search, Send, Globe, Undo2, History } from 'lucide-react';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const activityOptions = [
  { value: 'all', label: 'Tất cả mức hoạt động' },
  { value: 'LOW', label: 'Nhẹ' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Nặng' },
];

const detailFields = [
  { key: 'rationCode', label: 'Mã khẩu phần' },
  { key: 'rationName', label: 'Tên khẩu phần' },
  { key: 'breedName', label: 'Giống chó' },
  { key: 'activityLevel', label: 'Mức hoạt động' },
  { key: 'targetAgeMinMonths', label: 'Tuổi tối thiểu (tháng)' },
  { key: 'targetAgeMaxMonths', label: 'Tuổi tối đa (tháng)' },
  { key: 'healthCondition', label: 'Tình trạng sức khỏe' },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'specialNotes', label: 'Ghi chú đặc biệt', type: 'textarea' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdByName', label: 'Người tạo' },
];

const editFields = [
  { key: 'rationCode', label: 'Mã khẩu phần', required: true },
  { key: 'rationName', label: 'Tên khẩu phần', required: true },
  { key: 'activityLevel', label: 'Mức hoạt động', type: 'select', options: [{ value: 'LOW', label: 'Thấp' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'HIGH', label: 'Cao' }] },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'specialNotes', label: 'Ghi chú đặc biệt', type: 'textarea' },
];

const NutritionPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyTarget, setHistoryTarget] = useState({ title: '', typeLabel: '' });
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canPublish = user?.role === 'ADMIN';

  const toNutritionPayload = (formData) => ({
    rationCode: formData.rationCode?.trim() || '',
    rationName: formData.rationName?.trim() || '',
    activityLevel: formData.activityLevel || '',
    description: formData.description?.trim() || '',
    specialNotes: formData.specialNotes?.trim() || '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(pageSize));
      if (search) params.append('search', search);
      const res = await api.get(`/nutrition-standards?${params.toString()}`);
      const data = res.data || res;
      const list = data.content || [];
      setItems(list);
      setTotalItems(data.totalElements || list.length);
    } catch (err) { console.error('Fetch nutrition error:', err); setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn ẩn khẩu phần này?')) return;
    try { await api.delete(`/nutrition-standards/${id}`); fetchData(); } catch (err) { console.error('Delete error:', err); }
  };

  const getStandardId = (row) => row.standardId || row.id;
  const getStatus = (row) => String(row.status || '').toUpperCase();

  const handleSubmitForReview = async (row) => {
    const id = getStandardId(row);
    if (!id) return;
    try {
      await approvalService.submit(APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD, id);
      fetchData();
    } catch (err) {
      console.error('Submit nutrition for review error:', err);
      alert(err?.message || 'Không thể gửi duyệt');
    }
  };

  const handlePublish = async (row) => {
    const id = getStandardId(row);
    if (!id) return;
    try {
      await approvalService.publish(APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD, id);
      fetchData();
    } catch (err) {
      console.error('Publish nutrition error:', err);
      alert(err?.message || 'Không thể xuất bản');
    }
  };

  const handleUnpublish = async (row) => {
    const id = getStandardId(row);
    if (!id) return;
    try {
      await approvalService.unpublish(APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD, id);
      fetchData();
    } catch (err) {
      console.error('Unpublish nutrition error:', err);
      alert(err?.message || 'Không thể gỡ xuất bản');
    }
  };

  const openHistory = async (row) => {
    const id = getStandardId(row);
    if (!id) return;

    setHistoryTarget({ title: row?.rationName || '-', typeLabel: 'Tiêu chuẩn dinh dưỡng' });
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      const res = await approvalService.getHistory(APPROVAL_ENTITY_TYPES.NUTRITION_STANDARD, id);
      const payload = res?.data || res || [];
      setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
    } catch (err) {
      console.error('Fetch nutrition approval history error:', err);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = async (formData) => {
    setSaving(true);
    try { await api.put(`/nutrition-standards/${editItem.standardId}`, toNutritionPayload(formData)); setEditItem(null); fetchData(); }
    catch (err) { console.error('Update error:', err); alert('Có lỗi xảy ra khi cập nhật'); }
    finally { setSaving(false); }
  };

  const handleCreate = async (formData) => {
    setSaving(true);
    try { await api.post('/nutrition-standards', toNutritionPayload(formData)); setCreateOpen(false); fetchData(); }
    catch (err) { console.error('Create error:', err); alert('Có lỗi xảy ra khi tạo mới'); }
    finally { setSaving(false); }
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
    { key: 'rationCode', header: 'Mã', render: (r) => r.rationCode || '-' },
    { key: 'rationName', header: 'Tên khẩu phần', render: (r) => <span className="font-medium">{r.rationName || '-'}</span> },
    { key: 'breedName', header: 'Giống chó', render: (r) => r.breedName || 'Chung' },
    { key: 'activityLevel', header: 'Mức hoạt động', render: (r) => <StatusBadge status={r.activityLevel || 'MEDIUM'} /> },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'updatedAt', header: 'Cập nhật', className: 'w-44', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
    {
      key: 'actions', header: 'Thao tác', render: (r) => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => setDetailItem(r)}><Eye className="h-4 w-4" /></button>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Lịch sử duyệt" onClick={() => openHistory(r)}><History className="h-4 w-4 text-muted-foreground" /></button>
          {canEdit && <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Sửa" onClick={() => navigate(`/nutrition/${getStandardId(r)}/edit`)}><Pencil className="h-4 w-4" /></button>}
          {canDelete && <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Ẩn" onClick={() => handleDelete(getStandardId(r))}><EyeOff className="h-4 w-4 text-destructive" /></button>}
          {canEdit && ['DRAFT', 'REJECTED'].includes(getStatus(r)) && (
            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Gửi duyệt" onClick={() => handleSubmitForReview(r)}>
              <Send className="h-4 w-4 text-amber-600" />
            </button>
          )}
          {canPublish && getStatus(r) === 'APPROVED' && (
            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xuất bản" onClick={() => handlePublish(r)}>
              <Globe className="h-4 w-4 text-emerald-600" />
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

  const filteredItems = items.filter((item) => {
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchActivity = activityFilter === 'all' || (item.activityLevel || 'MEDIUM') === activityFilter;
    return matchStatus && matchActivity;
  });
  const hasClientFilter = statusFilter !== 'all' || activityFilter !== 'all';

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tiêu chuẩn Dinh dưỡng" description="Quản lý khẩu phần dinh dưỡng cho chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Dinh dưỡng' }]}
        actions={canEdit ? <button onClick={() => navigate('/nutrition/create')} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"><Plus className="h-4 w-4" />Tạo khẩu phần</button> : null} />
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm theo tên khẩu phần..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors w-64" />
        </div>
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả trạng thái" />
        <FilterSelect value={activityFilter} onChange={(v) => { setActivityFilter(v); setPage(0); }} options={activityOptions} placeholder="Tất cả mức hoạt động" className="w-[250px] [&>button]:w-full" />
      </div>
      {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
        <DataTable columns={columns} data={filteredItems} page={page} pageSize={pageSize} totalItems={hasClientFilter ? filteredItems.length : totalItems}
          onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có khẩu phần nào" />
      )}
      <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết khẩu phần" size="lg">
        <DetailView fields={detailFields} data={detailItem} />
      </DetailModal>
      <DetailModal open={!!editItem} onClose={() => setEditItem(null)} title="Sửa khẩu phần" size="lg">
        <EditForm fields={editFields} data={editItem} onSubmit={handleEdit} onCancel={() => setEditItem(null)} loading={saving} />
      </DetailModal>
      <DetailModal open={createOpen} onClose={() => setCreateOpen(false)} title="Thêm khẩu phần" size="lg">
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
    </div>
  );
};

export default NutritionPage;
