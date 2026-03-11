import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import DetailModal, { DetailView, EditForm } from '../../components/shared/DetailModal';
import { FilePenLine, Eye, Pencil, Trash2, Search } from 'lucide-react';
import api from '../../services/api';

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
  { value: 'all', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
];

const detailFields = [
  { key: 'breedName', label: 'Tên giống' },
  { key: 'origin', label: 'Nguồn gốc' },
  { key: 'sizeClassification', label: 'Kích thước', render: (d) => sizeLabels[d.sizeClassification] || d.sizeClassification || '-' },
  { key: 'trainabilityLevel', label: 'Khả năng huấn luyện', render: (d) => trainLabels[d.trainabilityLevel] || d.trainabilityLevel || '-' },
  { key: 'lifespanYears', label: 'Tuổi thọ' },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'operationalCapabilities', label: 'Khả năng tác chiến', type: 'textarea' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'createdByName', label: 'Người tạo' },
];

const editFields = [
  { key: 'breedName', label: 'Tên giống', required: true },
  { key: 'origin', label: 'Nguồn gốc' },
  { key: 'sizeClassification', label: 'Kích thước', type: 'select', options: [{ value: 'SMALL', label: 'Nhỏ' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'LARGE', label: 'Lớn' }, { value: 'GIANT', label: 'Khổng lồ' }] },
  { key: 'trainabilityLevel', label: 'Khả năng huấn luyện', type: 'select', options: [{ value: 'LOW', label: 'Thấp' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'HIGH', label: 'Cao' }, { value: 'VERY_HIGH', label: 'Rất cao' }] },
  { key: 'lifespanYears', label: 'Tuổi thọ' },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'operationalCapabilities', label: 'Khả năng tác chiến', type: 'textarea' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [{ value: 'DRAFT', label: 'Nháp' }, { value: 'PUBLISHED', label: 'Xuất bản' }] },
];

const BreedsPage = () => {
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
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
      const res = await api.get(`/breeds?${params.toString()}`);
      const data = res.data || res;
      let list = data.content || [];
      if (sizeFilter !== 'all') list = list.filter(b => b.sizeClassification === sizeFilter);
      if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter);
      setItems(list);
      setTotalItems(data.totalElements || list.length);
    } catch (err) {
      console.error('Fetch breeds error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, sizeFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giống chó này?')) return;
    try { await api.delete(`/breeds/${id}`); fetchData(); } catch (err) { console.error('Delete error:', err); }
  };

  const handleEdit = async (formData) => {
    setSaving(true);
    try {
      await api.put(`/breeds/${editItem.breedId}`, formData);
      setEditItem(null);
      fetchData();
    } catch (err) {
      console.error('Update error:', err);
      alert('Có lỗi xảy ra khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`; } catch { return d; }
  };

  const columns = [
    { key: 'breedName', header: 'Tên giống', render: (r) => <span className="font-medium">{r.breedName || '-'}</span> },
    { key: 'origin', header: 'Nguồn gốc', render: (r) => r.origin || '-' },
    { key: 'sizeClassification', header: 'Kích thước', render: (r) => sizeLabels[r.sizeClassification] || r.sizeClassification || '-' },
    { key: 'trainabilityLevel', header: 'Khả năng huấn luyện', render: (r) => trainLabels[r.trainabilityLevel] || r.trainabilityLevel || '-' },
    { key: 'status', header: 'Trạng thái', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'updatedAt', header: 'Cập nhật', render: (r) => formatDate(r.updatedAt) },
    {
      key: 'actions', header: 'Thao tác', render: (r) => (
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xem" onClick={() => setDetailItem(r)}><Eye className="h-4 w-4 text-muted-foreground" /></button>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Sửa" onClick={() => setEditItem(r)}><Pencil className="h-4 w-4 text-muted-foreground" /></button>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Xóa" onClick={() => handleDelete(r.breedId)}><Trash2 className="h-4 w-4 text-destructive" /></button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dữ liệu Giống chó" description="Quản lý thông tin các giống chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Giống chó' }]}
        actions={<button className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"><FilePenLine className="h-4 w-4" />Thêm giống chó</button>} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm theo tên giống chó..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="h-9 pl-9 pr-3 border border-border rounded-lg text-sm bg-background outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors w-64" />
        </div>
        <FilterSelect value={sizeFilter} onChange={(v) => { setSizeFilter(v); setPage(0); }} options={sizeOptions} placeholder="Tất cả kích thước" />
        <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={statusOptions} placeholder="Tất cả" />
      </div>

      {loading ? <div className="h-64 bg-card rounded-xl border border-border/60 animate-pulse" /> : (
        <DataTable columns={columns} data={items} page={page} pageSize={pageSize} totalItems={totalItems}
          onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }} emptyMessage="Chưa có giống chó nào" />
      )}

      {/* Detail Modal */}
      <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết giống chó" size="lg">
        <DetailView fields={detailFields} data={detailItem} />
      </DetailModal>

      {/* Edit Modal */}
      <DetailModal open={!!editItem} onClose={() => setEditItem(null)} title="Sửa giống chó" size="lg">
        <EditForm fields={editFields} data={editItem} onSubmit={handleEdit} onCancel={() => setEditItem(null)} loading={saving} />
      </DetailModal>
    </div>
  );
};

export default BreedsPage;
