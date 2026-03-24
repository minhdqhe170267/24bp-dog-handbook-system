import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import { Modal, FormField, FormInput, FormTextarea, FormSelect, FormSwitch, Button, ConfirmDialog } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { diseaseService } from '../../services/diseaseService';
import { Plus, Pencil, Trash2, Search, Eye, Send, Globe, Undo2, History } from 'lucide-react';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getBooleanLabel, getSeverityLabel, getStatusLabel } from '../../utils/enumLabels';
import { sortByNewest } from '../../utils/sortByNewest';
import { fetchAllPages, paginateRows } from '../../utils/clientPagination';

const severityFilterOptions = [
  { value: 'all', label: 'Tất cả mức độ' },
  { value: 'CRITICAL', label: 'Nguy hiểm' },
  { value: 'HIGH', label: 'Nặng' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'LOW', label: 'Nhẹ' },
];

const contagiousFilterOptions = [
  { value: 'all', label: 'Tất cả lây nhiễm' },
  { value: 'true', label: 'Có' },
  { value: 'false', label: 'Không' },
];

const statusFilterOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const normalizeSeverity = (value) => {
  if (!value) return '';
  const raw = String(value).trim().toUpperCase();
  if (raw === 'SEVERE') return 'HIGH';
  if (raw === 'MODERATE') return 'MEDIUM';
  if (raw === 'MILD') return 'LOW';
  return raw;
};

const DiseasesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [contagiousFilter, setContagiousFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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
      const allRows = await fetchAllPages((pageIndex, batchSize) => diseaseService.getAll(pageIndex, batchSize, search));

      const filteredRows = allRows.filter((item) => {
        const matchSeverity = severityFilter === 'all' || normalizeSeverity(item.severityLevel) === severityFilter;
        const matchContagious = contagiousFilter === 'all' || String(Boolean(item.isContagious)) === contagiousFilter;
        const matchStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchSeverity && matchContagious && matchStatus;
      });

      const sortedRows = sortByNewest(filteredRows, { idKeys: ['diseaseId', 'id'] });
      const { pageRows, totalItems, effectivePage } = paginateRows(sortedRows, nextPage, nextPageSize);

      setDiseases(pageRows);
      setPagination((prev) => ({ ...prev, total: totalItems, page: effectivePage }));
    } catch (err) { toast.error(err, { title: 'Lỗi tải danh sách bệnh' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(0, pagination.pageSize); }, [search, severityFilter, contagiousFilter, statusFilter]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.diseaseName) { toast.error('Vui lòng nhập tên bệnh'); return; }
    try {
      const isCreate = !editing;
      if (editing) { await diseaseService.update(editing.diseaseId, formData); toast.success('Cập nhật thành công'); }
      else { await diseaseService.create(formData); toast.success('Tạo mới thành công'); }
      setModalOpen(false); setFormData({}); setEditing(null);
      if (isCreate) fetchData(0, pagination.pageSize);
      else fetchData(pagination.page, pagination.pageSize);
    } catch (err) { toast.error(err, { title: 'Có lỗi xảy ra' }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await diseaseService.delete(deleteId); toast.success('Đã xóa bệnh thành công'); setDeleteId(null); fetchData(pagination.page, pagination.pageSize); }
    catch (err) { toast.error(err, { title: 'Lỗi khi xóa bệnh' }); }
  };

  const getDiseaseId = (row) => row.diseaseId || row.id;
  const getStatus = (row) => String(row.status || '').toUpperCase();
  const canShowEdit = (row) => canEdit && !['PENDING', 'APPROVED', 'PUBLISHED'].includes(getStatus(row));

  const handleSubmitForReview = async (row) => {
    const id = getDiseaseId(row);
    if (!id) return;
    try {
      await approvalService.submit(APPROVAL_ENTITY_TYPES.DISEASE, id);
      toast.success('Đã gửi duyệt');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Submit disease for review error:', err);
      toast.error(err, { title: 'Không thể gửi duyệt' });
    }
  };

  const handlePublish = async (row) => {
    const id = getDiseaseId(row);
    if (!id) return;
    try {
      await approvalService.publish(APPROVAL_ENTITY_TYPES.DISEASE, id);
      toast.success('Đã xuất bản');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Publish disease error:', err);
      toast.error(err, { title: 'Không thể xuất bản' });
    }
  };

  const handleUnpublish = async (row) => {
    const id = getDiseaseId(row);
    if (!id) return;
    try {
      await approvalService.unpublish(APPROVAL_ENTITY_TYPES.DISEASE, id);
      toast.success('Đã gỡ xuất bản');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Unpublish disease error:', err);
      toast.error(err, { title: 'Không thể gỡ xuất bản' });
    }
  };

  const openHistory = async (row) => {
    const id = getDiseaseId(row);
    if (!id) return;

    setHistoryTarget({ title: row?.diseaseName || '-', typeLabel: 'Bệnh' });
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      const res = await approvalService.getHistory(APPROVAL_ENTITY_TYPES.DISEASE, id);
      const payload = res?.data || res || [];
      setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
    } catch (err) {
      console.error('Fetch disease approval history error:', err);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEdit = (r) => {
    const id = getDiseaseId(r);
    if (!id) return;
    navigate(`/diseases/${id}/edit`);
  };
  const openCreate = () => { setEditing(null); setFormData({}); setModalOpen(true); };
  const openDetail = (r) => {
    const id = getDiseaseId(r);
    if (!id) return;
    navigate(`/details/DISEASE/${id}`);
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
      key: 'isContagious', header: 'Lây nhiễm', className: 'w-28 whitespace-nowrap', render: (r) => r.isContagious
        ? <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Có</span>
        : <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Không</span>
    },
    { key: 'status', header: 'Trạng thái', className: 'w-36', render: (r) => r.status ? <StatusBadge status={r.status} /> : '—' },
    { key: 'updatedAt', header: 'Cập nhật', className: 'w-44', render: (r) => renderDateTimeCell(r.updatedAt || r.createdAt) },
    {
      key: 'actions', header: 'Thao tác', className: 'w-48', render: (r) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(r)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" title="Lịch sử duyệt" onClick={() => openHistory(r)}><History className="h-4 w-4 text-muted-foreground" /></Button>
          {canShowEdit(r) && <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>}
          {canDelete && <Button variant="ghost" size="sm" title="Xóa" onClick={() => setDeleteId(getDiseaseId(r))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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
      <PageHeader title="Quản lý Bệnh" description="Danh sách các bệnh thường gặp ở chó nghiệp vụ"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Bệnh' }]}
        actions={canEdit ? <Button onClick={() => navigate('/diseases/create')} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"><Plus className="h-4 w-4" />Tạo bệnh</Button> : null} />
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Tìm kiếm..." className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect value={severityFilter} onChange={(value) => { setSeverityFilter(value); setPagination((prev) => ({ ...prev, page: 0 })); }} options={severityFilterOptions} className="w-[148px]" />
          <FilterSelect value={contagiousFilter} onChange={(value) => { setContagiousFilter(value); setPagination((prev) => ({ ...prev, page: 0 })); }} options={contagiousFilterOptions} className="w-[158px]" />
          <FilterSelect value={statusFilter} onChange={(value) => { setStatusFilter(value); setPagination((prev) => ({ ...prev, page: 0 })); }} options={statusFilterOptions} className="w-[168px]" />
        </div>
      </div>
      <DataTable columns={columns} data={diseases} loading={loading} page={pagination.page} pageSize={pagination.pageSize} totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)} onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchData(0, s); }} emptyMessage="Chưa có bệnh nào" />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa bệnh' : 'Thêm bệnh mới'} width={650}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button><Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button></>}>
        <form onSubmit={handleSubmit}>
          <FormField label="Tên bệnh" required><FormInput placeholder="VD: Parvo" value={formData.diseaseName || ''} onChange={(e) => updateField('diseaseName', e.target.value)} /></FormField>
          <FormField label="Mức độ">
            <FormSelect value={formData.severityLevel || ''} onChange={(e) => updateField('severityLevel', e.target.value)} placeholder="Chọn mức độ"
              options={[{ value: 'LOW', label: 'Nhẹ' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'HIGH', label: 'Nặng' }, { value: 'CRITICAL', label: 'Nguy kịch' }]} />
          </FormField>
          <FormField label="Mô tả"><FormTextarea rows={3} value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></FormField>
          <FormField label="Triệu chứng"><FormTextarea rows={2} value={formData.commonSymptoms || ''} onChange={(e) => updateField('commonSymptoms', e.target.value)} /></FormField>
          <FormField label="Điều trị"><FormTextarea rows={2} value={formData.treatment || ''} onChange={(e) => updateField('treatment', e.target.value)} /></FormField>
          <FormField label="Phòng ngừa"><FormTextarea rows={2} value={formData.preventionMethods || ''} onChange={(e) => updateField('preventionMethods', e.target.value)} /></FormField>
          <FormField label="Lây nhiễm"><FormSwitch checked={formData.isContagious || false} onChange={(v) => updateField('isContagious', v)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} title="Xóa bệnh" description="Bạn có chắc chắn muốn xóa bệnh này?" onConfirm={handleDelete} confirmLabel="Xóa" />
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

export default DiseasesPage;

