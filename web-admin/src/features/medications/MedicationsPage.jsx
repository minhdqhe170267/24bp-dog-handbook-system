import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import StatusBadge from '../../components/shared/StatusBadge';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import { Modal, FormField, FormInput, FormTextarea, Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { medicationService } from '../../services/medicationService';
import { Plus, Pencil, Trash2, Eye, Search, Send, Globe, Undo2, History } from 'lucide-react';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const MedicationsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [formData, setFormData] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyTarget, setHistoryTarget] = useState({ title: '', typeLabel: '' });
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canPublish = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';

  const fetchData = async (nextPage = pagination.page, nextPageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const statusQuery = status === 'all' ? '' : status;
      const allRows = await fetchAllPages((pageIndex, batchSize) =>
        medicationService.getAll(pageIndex, batchSize, search, statusQuery)
      );
      const filteredRows = status === 'all' ? allRows : allRows.filter((item) => item.status === status);
      const sortedRows = sortByNewest(filteredRows, { idKeys: ['medicationId', 'id'] });
      const { pageRows, totalItems, effectivePage } = paginateRows(sortedRows, nextPage, nextPageSize);
      setMedications(pageRows);
      setPagination((prev) => ({ ...prev, total: totalItems, page: effectivePage }));
    } catch (err) { toast.error(err, { title: 'Lỗi tải danh sách thuốc' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(0, pagination.pageSize); }, [search, status]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.medicationName) { toast.error('Vui lòng nhập tên thuốc'); return; }
    try {
      const isCreate = !editing;
      if (editing) { await medicationService.update(editing.medicationId, formData); toast.success('Cập nhật thành công'); }
      else { await medicationService.create(formData); toast.success('Tạo mới thành công'); }
      setModalOpen(false); setFormData({}); setEditing(null);
      if (isCreate) {
        fetchData(0, pagination.pageSize);
      } else {
        fetchData(pagination.page, pagination.pageSize);
      }
    } catch (err) { toast.error(err, { title: 'Không thể lưu thông tin thuốc' }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await medicationService.delete(deleteId); toast.success('Đã xóa thuốc thành công'); setDeleteId(null); fetchData(pagination.page, pagination.pageSize); }
    catch (err) { toast.error(err, { title: 'Không thể xóa thuốc' }); }
  };

  const getMedicationId = (row) => row.medicationId || row.id;
  const getStatus = (row) => String(row.status || '').toUpperCase();
  const canShowEdit = (row) => canEdit && !['PENDING', 'APPROVED', 'PUBLISHED'].includes(getStatus(row));

  const handleSubmitForReview = async (row) => {
    const id = getMedicationId(row);
    if (!id) return;
    try {
      await approvalService.submit(APPROVAL_ENTITY_TYPES.MEDICATION, id);
      toast.success('Đã gửi duyệt');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Submit medication for review error:', err);
      toast.error(err, { title: 'Không thể gửi duyệt thuốc' });
    }
  };

  const handlePublish = async (row) => {
    const id = getMedicationId(row);
    if (!id) return;
    try {
      await approvalService.publish(APPROVAL_ENTITY_TYPES.MEDICATION, id);
      toast.success('Đã xuất bản');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Publish medication error:', err);
      toast.error(err, { title: 'Không thể xuất bản thuốc' });
    }
  };

  const handleUnpublish = async (row) => {
    const id = getMedicationId(row);
    if (!id) return;
    try {
      await approvalService.unpublish(APPROVAL_ENTITY_TYPES.MEDICATION, id);
      toast.success('Đã gỡ xuất bản');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Unpublish medication error:', err);
      toast.error(err, { title: 'Không thể gỡ xuất bản thuốc' });
    }
  };

  const openHistory = async (row) => {
    const id = getMedicationId(row);
    if (!id) return;

    setHistoryTarget({ title: row?.medicationName || '-', typeLabel: 'Thuốc' });
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      const res = await approvalService.getHistory(APPROVAL_ENTITY_TYPES.MEDICATION, id);
      const payload = res?.data || res || [];
      setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
    } catch (err) {
      console.error('Fetch medication approval history error:', err);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openDetail = (r) => {
    const id = getMedicationId(r);
    if (!id) return;
    navigate(`/details/MEDICATION/${id}`);
  };

  const openEdit = (r) => {
    const id = getMedicationId(r);
    if (!id) return;
    navigate(`/medications/${id}/edit`);
  };
  const openCreate = () => { setEditing(null); setFormData({}); setModalOpen(true); };
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
    { key: 'medicationName', header: 'Tên thuốc', render: (r) => <span className="font-medium text-foreground">{r.medicationName}</span> },
    { key: 'administrationMethod', header: 'Phương pháp dùng' },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'w-40',
      render: (r) => <StatusBadge status={r.status} />,
    },
    { key: 'updatedAt', header: 'Cập nhật', className: 'w-44', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
    {
      key: 'actions', header: 'Thao tác', className: 'w-48', render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" title="Lịch sử duyệt" onClick={() => openHistory(r)}><History className="h-4 w-4 text-muted-foreground" /></Button>
          {canShowEdit(r) && <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>}
          {canDelete && getStatus(r) === 'DRAFT' && <Button variant="ghost" size="sm" title="Xóa" onClick={() => setDeleteId(getMedicationId(r))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          {canEdit && ['DRAFT', 'REJECTED'].includes(getStatus(r)) && (
            <Button variant="ghost" size="sm" title="Gửi duyệt" onClick={() => handleSubmitForReview(r)}><Send className="h-4 w-4 text-amber-600 dark:text-amber-300" /></Button>
          )}
          {canPublish && getStatus(r) === 'APPROVED' && (
            <Button variant="ghost" size="sm" title="Xuất bản" onClick={() => handlePublish(r)}><Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-300" /></Button>
          )}
          {canPublish && getStatus(r) === 'PUBLISHED' && (
            <Button variant="ghost" size="sm" title="Gỡ xuất bản" onClick={() => handleUnpublish(r)}><Undo2 className="h-4 w-4 text-muted-foreground" /></Button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Quản lý Thuốc" description="Danh sách thuốc sử dụng cho chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Thuốc' }]}
        actions={canEdit ? <Button onClick={() => navigate('/medications/create')} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"><Plus className="h-4 w-4" />Tạo thuốc</Button> : null} />
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm kiếm..." className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <FilterSelect value={status} onChange={(value) => { setStatus(value); setPagination((prev) => ({ ...prev, page: 0 })); }} options={statusOptions} className="w-48" />
      </div>
      <DataTable columns={columns} data={medications} loading={loading} page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)} onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchData(0, s); }} emptyMessage="Chưa có thuốc nào" />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa thuốc' : 'Thêm thuốc mới'} width={650}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button><Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button></>}>
        <form onSubmit={handleSubmit}>
          <FormField label="Tên thuốc" required><FormInput maxLength={200} placeholder="VD: Amoxicillin" value={formData.medicationName || ''} onChange={(e) => updateField('medicationName', e.target.value)} /></FormField>
          <FormField label="Mô tả"><FormTextarea maxLength={255} rows={3} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></FormField>
          <FormField label="Liều dùng"><FormTextarea maxLength={255} rows={2} value={formData.dosageInstructions || ''} onChange={(e) => updateField('dosageInstructions', e.target.value)} /></FormField>
          <FormField label="Phương pháp dùng"><FormInput maxLength={200} value={formData.administrationMethod || ''} onChange={(e) => updateField('administrationMethod', e.target.value)} /></FormField>
          <FormField label="Tác dụng phụ"><FormTextarea maxLength={255} rows={2} value={formData.sideEffects || ''} onChange={(e) => updateField('sideEffects', e.target.value)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Xóa thuốc" description="Bạn có chắc chắn muốn xóa thuốc này?" onConfirm={handleDelete} confirmLabel="Xóa" />
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

export default MedicationsPage;



