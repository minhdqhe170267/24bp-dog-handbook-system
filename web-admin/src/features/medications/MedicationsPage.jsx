import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import { Modal, FormField, FormInput, FormTextarea, Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { medicationService } from '../../services/medicationService';
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';

const MedicationsPage = () => {
  const toast = useToast();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({});

  const fetchData = async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await medicationService.getAll(page, size, search);
      setMedications(res.data.content || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalElements, page }));
    } catch (err) { toast.error('Lỗi tải danh sách thuốc'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(0, pagination.pageSize); }, [search]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.medicationName) { toast.error('Vui lòng nhập tên thuốc'); return; }
    try {
      if (editing) { await medicationService.update(editing.medicationId, formData); toast.success('Cập nhật thành công'); }
      else { await medicationService.create(formData); toast.success('Tạo mới thành công'); }
      setModalOpen(false); setFormData({}); setEditing(null);
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) { toast.error(err?.message || 'Có lỗi xảy ra'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await medicationService.delete(deleteId); toast.success('Xóa thành công'); setDeleteId(null); fetchData(pagination.page, pagination.pageSize); }
    catch (err) { toast.error('Lỗi khi xóa'); }
  };

  const openDetail = async (r) => {
    try { const res = await medicationService.getById(r.medicationId); setDetailData(res.data); setDetailOpen(true); }
    catch (err) { toast.error('Lỗi tải chi tiết thuốc'); }
  };

  const openEdit = (r) => { setEditing(r); setFormData({ ...r }); setModalOpen(true); };
  const openCreate = () => { setEditing(null); setFormData({}); setModalOpen(true); };
  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const columns = [
    { key: 'medicationId', header: 'ID', className: 'w-16' },
    { key: 'medicationName', header: 'Tên thuốc', render: (r) => <span className="font-medium text-foreground">{r.medicationName}</span> },
    { key: 'administrationMethod', header: 'Phương pháp dùng' },
    {
      key: 'actions', header: 'Thao tác', className: 'w-36', render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(r.medicationId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Quản lý Thuốc" description="Danh sách thuốc sử dụng cho chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Thuốc' }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm mới</Button>} />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm kiếm..." className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-card"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <DataTable columns={columns} data={medications} loading={loading} page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)} onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchData(0, s); }} emptyMessage="Chưa có thuốc nào" />

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết thuốc" width={650}>
        {detailData && (
          <div className="space-y-3">
            {[['Tên thuốc', detailData.medicationName], ['Mô tả', detailData.description], ['Liều dùng', detailData.dosageInstructions],
            ['Phương pháp', detailData.administrationMethod], ['Tác dụng phụ', detailData.sideEffects], ['Chống chỉ định', detailData.contraindications],
            ['Bảo quản', detailData.storageRequirements]].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-36 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground">{value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa thuốc' : 'Thêm thuốc mới'} width={650}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button><Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button></>}>
        <form onSubmit={handleSubmit}>
          <FormField label="Tên thuốc" required><FormInput placeholder="VD: Amoxicillin" value={formData.medicationName || ''} onChange={(e) => updateField('medicationName', e.target.value)} /></FormField>
          <FormField label="Mô tả"><FormTextarea rows={3} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></FormField>
          <FormField label="Liều dùng"><FormTextarea rows={2} value={formData.dosageInstructions || ''} onChange={(e) => updateField('dosageInstructions', e.target.value)} /></FormField>
          <FormField label="Phương pháp dùng"><FormInput value={formData.administrationMethod || ''} onChange={(e) => updateField('administrationMethod', e.target.value)} /></FormField>
          <FormField label="Tác dụng phụ"><FormTextarea rows={2} value={formData.sideEffects || ''} onChange={(e) => updateField('sideEffects', e.target.value)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Xóa thuốc" description="Bạn có chắc chắn muốn xóa thuốc này?" onConfirm={handleDelete} confirmLabel="Xóa" />
    </div>
  );
};

export default MedicationsPage;
