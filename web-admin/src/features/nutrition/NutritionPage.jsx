import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView, EditForm } from '../../components/shared/DetailModal';
import { FilePenLine, Eye, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../services/api';

const statusOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
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
  { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'DRAFT', label: 'Nháp' }, { value: 'PUBLISHED', label: 'Xuất bản' }] },
];

const NutritionPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(pageSize));
      if (search) params.append('search', search);
      const res = await api.get(`/nutrition-standards?${params.toString()}`);
      const data = res.data || res;
      let list = data.content || [];
      if (statusFilter !== 'all') list = list.filter(n => n.status === statusFilter);
      setItems(list);
      setTotalItems(data.totalElements || list.length);
    } catch (err) { console.error('Fetch nutrition error:', err); setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khẩu phần này?')) return;
    try { await api.delete(`/nutrition-standards/${id}`); fetchData(); } catch (err) { console.error('Delete error:', err); }
  };

  const handleEdit = async (formData) => {
    setSaving(true);
    try { await api.put(`/nutrition-standards/${editItem.standardId}`, formData); setEditItem(null); fetchData(); }
    catch (err) { console.error('Update error:', err); alert('Có lỗi xảy ra khi cập nhật'); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'rationCode', header: 'Mã', render: (r) => r.rationCode || '-' },
    { key: 'rationName', header: 'Tên khẩu phần', render: (r) => <span className="font-medium">{r.rationName || '-'}</span> },
    { key: 'breedName', header: 'Giống chó', render: (r) => r.breedName || 'Chung' },
    { key: 'activityLevel', header: 'Mức hoạt động', render: (r) => <StatusBadge status={r.activityLevel || 'MEDIUM'} /> },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Thao tác', render: (r) => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => setDetailItem(r)}><Eye className="h-4 w-4 text-muted-foreground" /></button>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Sửa" onClick={() => setEditItem(r)}><Pencil className="h-4 w-4 text-muted-foreground" /></button>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xóa" onClick={() => handleDelete(r.standardId)}><Trash2 className="h-4 w-4 text-destructive" /></button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tiêu chuẩn Dinh dưỡng" description="Quản lý khẩu phần dinh dưỡng cho chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Dinh dưỡng' }]}
        actions={<button className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"><FilePenLine className="h-4 w-4" />Thêm khẩu phần</button>} />
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm theo tên khẩu phần..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors w-64" />
        </div>
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả" />
      </div>
      {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
        <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
          onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có khẩu phần nào" />
      )}
      <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết khẩu phần" size="lg">
        <DetailView fields={detailFields} data={detailItem} />
      </DetailModal>
      <DetailModal open={!!editItem} onClose={() => setEditItem(null)} title="Sửa khẩu phần" size="lg">
        <EditForm fields={editFields} data={editItem} onSubmit={handleEdit} onCancel={() => setEditItem(null)} loading={saving} />
      </DetailModal>
    </div>
  );
};

export default NutritionPage;
