import { useState, useEffect } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import { Modal, FormField, FormInput, FormTextarea, FormSelect, FormSwitch, Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { diseaseService } from '../../services/diseaseService';
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';

const DiseasesPage = () => {
  const toast = useToast();
  const [diseases, setDiseases] = useState([]);
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
      const res = await diseaseService.getAll(page, size, search);
      setDiseases(res.data.content || []);
      setPagination((prev) => ({ ...prev, total: res.data.totalElements, page }));
    } catch (err) { toast.error('Lỗi tải danh sách bệnh'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(0, pagination.pageSize); }, [search]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.diseaseName) { toast.error('Vui lòng nhập tên bệnh'); return; }
    try {
      if (editing) { await diseaseService.update(editing.diseaseId, formData); toast.success('Cập nhật thành công'); }
      else { await diseaseService.create(formData); toast.success('Tạo mới thành công'); }
      setModalOpen(false); setFormData({}); setEditing(null);
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) { toast.error(err?.message || 'Có lỗi xảy ra'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await diseaseService.delete(deleteId); toast.success('Xóa thành công'); setDeleteId(null); fetchData(pagination.page, pagination.pageSize); }
    catch (err) { toast.error('Lỗi khi xóa'); }
  };

  const openEdit = (r) => { setEditing(r); setFormData({ ...r }); setModalOpen(true); };
  const openCreate = () => { setEditing(null); setFormData({}); setModalOpen(true); };
  const openDetail = async (r) => {
    try {
      const res = await diseaseService.getById(r.diseaseId);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err) { toast.error('Lỗi tải chi tiết bệnh'); }
  };
  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

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
    { key: 'diseaseName', header: 'Tên bệnh', render: (r) => <span className="font-medium text-foreground">{r.diseaseName}</span> },
    { key: 'severityLevel', header: 'Mức độ', render: (r) => r.severityLevel ? <StatusBadge status={r.severityLevel} /> : '—' },
    {
      key: 'isContagious', header: 'Lây nhiễm', className: 'w-24', render: (r) => r.isContagious
        ? <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Có</span>
        : <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Không</span>
    },
    { key: 'status', header: 'Trạng thái', className: 'w-36', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'updatedAt', header: 'Cập nhật', className: 'w-44', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
    {
      key: 'actions', header: 'Thao tác', className: 'w-36', render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(r.diseaseId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Quản lý Bệnh" description="Danh sách các bệnh thường gặp ở chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Bệnh' }]}
        actions={<Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"><Plus className="h-4 w-4" />Tạo bệnh</Button>} />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm kiếm..." className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <DataTable columns={columns} data={diseases} loading={loading} page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)} onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchData(0, s); }} emptyMessage="Chưa có bệnh nào" />

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết bệnh" width={650}>
        {detailData && (
          <div className="space-y-3">
            {[['Tên bệnh', detailData.diseaseName], ['Mức độ', detailData.severityLevel], ['Trạng thái', detailData.status], ['Lây nhiễm', detailData.isContagious ? 'Có' : 'Không'],
            ['Mô tả', detailData.description], ['Triệu chứng', detailData.commonSymptoms], ['Điều trị', detailData.treatment],
            ['Phòng ngừa', detailData.preventionMethods]].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-36 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground">{value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa bệnh' : 'Thêm bệnh mới'} width={650}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button><Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button></>}>
        <form onSubmit={handleSubmit}>
          <FormField label="Tên bệnh" required><FormInput placeholder="VD: Parvo" value={formData.diseaseName || ''} onChange={(e) => updateField('diseaseName', e.target.value)} /></FormField>
          <FormField label="Mức độ">
            <FormSelect value={formData.severityLevel || ''} onChange={(e) => updateField('severityLevel', e.target.value)} placeholder="Chọn mức độ"
              options={[{ value: 'MILD', label: 'Nhẹ' }, { value: 'MODERATE', label: 'Trung bình' }, { value: 'SEVERE', label: 'Nặng' }, { value: 'CRITICAL', label: 'Nguy kịch' }]} />
          </FormField>
          <FormField label="Mô tả"><FormTextarea rows={3} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></FormField>
          <FormField label="Triệu chứng"><FormTextarea rows={2} value={formData.commonSymptoms || ''} onChange={(e) => updateField('commonSymptoms', e.target.value)} /></FormField>
          <FormField label="Điều trị"><FormTextarea rows={2} value={formData.treatment || ''} onChange={(e) => updateField('treatment', e.target.value)} /></FormField>
          <FormField label="Phòng ngừa"><FormTextarea rows={2} value={formData.preventionMethods || ''} onChange={(e) => updateField('preventionMethods', e.target.value)} /></FormField>
          <FormField label="Lây nhiễm"><FormSwitch checked={formData.isContagious || false} onChange={(v) => updateField('isContagious', v)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Xóa bệnh" description="Bạn có chắc chắn muốn xóa bệnh này?" onConfirm={handleDelete} confirmLabel="Xóa" />
    </div>
  );
};

export default DiseasesPage;
