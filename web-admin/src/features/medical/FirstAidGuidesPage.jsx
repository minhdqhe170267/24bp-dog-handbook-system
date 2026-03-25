import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import StatusBadge from '../../components/shared/StatusBadge';
import ApprovalHistoryModal from '../../components/shared/ApprovalHistoryModal';
import EntityMediaPreview from '../../components/shared/EntityMediaPreview';
import {
  Modal,
  FormField,
  FormInput,
  FormTextarea,
  Button,
  ConfirmDialog,
} from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { firstAidGuideService } from '../../services/firstAidGuideService';
import { Plus, Pencil, Trash2, Eye, Search, Send, Globe, Undo2, History } from 'lucide-react';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { useAuth } from '../../hooks/useAuth';
import { getStatusLabel } from '../../utils/enumLabels';
import { sortByNewest } from '../../utils/sortByNewest';

const EMPTY_FORM = {
  guideTitle: '',
  emergencyType: '',
  description: '',
  immediateSteps: '',
  requiredMaterials: '',
  doNotActions: '',
  whenToSeekVet: '',
};

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
  { value: 'REJECTED', label: 'Từ chối' },
];

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

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

const FirstAidGuidesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyTarget, setHistoryTarget] = useState({ title: '', typeLabel: '' });
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'CONTENT_EDITOR';
  const canPublish = user?.role === 'ADMIN';

  const fetchData = async (page = 0, size = pagination.pageSize) => {
    setLoading(true);
    try {
      const statusQuery = status === 'all' ? '' : status;
      const res = await firstAidGuideService.getAll(page, size, search, statusQuery);
      const list = res.data?.content || [];
      setGuides(sortByNewest(list, { idKeys: ['guideId', 'id'] }));
      setPagination((prev) => ({
        ...prev,
        page,
        total: res.data?.totalElements || 0,
      }));
    } catch (err) {
      toast.error(err, { title: 'Lỗi tải danh sách sơ cứu' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, pagination.pageSize);
  }, [search, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const toPayload = () => ({
    guideTitle: formData.guideTitle?.trim() || '',
    emergencyType: formData.emergencyType?.trim() || '',
    description: formData.description?.trim() || '',
    immediateSteps: formData.immediateSteps?.trim() || '',
    requiredMaterials: formData.requiredMaterials?.trim() || '',
    doNotActions: formData.doNotActions?.trim() || '',
    whenToSeekVet: formData.whenToSeekVet?.trim() || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = toPayload();

    if (!payload.guideTitle) {
      toast.error('Vui lòng nhập tiêu đề sơ cứu');
      return;
    }
    if (!payload.emergencyType) {
      toast.error('Vui lòng nhập loại tình huống');
      return;
    }
    if (!payload.immediateSteps) {
      toast.error('Vui lòng nhập các bước xử lý ngay');
      return;
    }

    try {
      const isCreate = !editing;
      if (editing) {
        await firstAidGuideService.update(editing.guideId, payload);
        toast.success('Cập nhật thành công');
      } else {
        await firstAidGuideService.create(payload);
        toast.success('Tạo mới thành công');
      }

      setModalOpen(false);
      setEditing(null);
      setFormData(EMPTY_FORM);
      if (isCreate) {
        fetchData(0, pagination.pageSize);
      } else {
        fetchData(pagination.page, pagination.pageSize);
      }
    } catch (err) {
      toast.error(err, { title: 'Có lỗi xảy ra' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await firstAidGuideService.delete(deleteId);
      toast.success('Đã xóa hướng dẫn sơ cứu');
      setDeleteId(null);
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) {
      toast.error(err, { title: 'Lỗi khi xóa hướng dẫn sơ cứu' });
    }
  };

  const getGuideId = (row) => row.guideId || row.id;
  const getStatus = (row) => String(row.status || '').toUpperCase();
  const canShowEdit = (row) => canEdit && !['APPROVED', 'PUBLISHED'].includes(getStatus(row));

  const handleSubmitForReview = async (row) => {
    const id = getGuideId(row);
    if (!id) return;
    try {
      await approvalService.submit(APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE, id);
      toast.success('Đã gửi duyệt');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Submit first aid guide for review error:', err);
      toast.error(err, { title: 'Không thể gửi duyệt' });
    }
  };

  const handlePublish = async (row) => {
    const id = getGuideId(row);
    if (!id) return;
    try {
      await approvalService.publish(APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE, id);
      toast.success('Đã xuất bản');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Publish first aid guide error:', err);
      toast.error(err, { title: 'Không thể xuất bản' });
    }
  };

  const handleUnpublish = async (row) => {
    const id = getGuideId(row);
    if (!id) return;
    try {
      await approvalService.unpublish(APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE, id);
      toast.success('Đã gỡ xuất bản');
      await fetchData(0, pagination.pageSize);
    } catch (err) {
      console.error('Unpublish first aid guide error:', err);
      toast.error(err, { title: 'Không thể gỡ xuất bản' });
    }
  };

  const openHistory = async (row) => {
    const id = getGuideId(row);
    if (!id) return;

    setHistoryTarget({ title: row?.guideTitle || '-', typeLabel: 'Sơ cứu' });
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRecords([]);
    try {
      const res = await approvalService.getHistory(APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE, id);
      const payload = res?.data || res || [];
      setHistoryRecords(Array.isArray(payload) ? payload : payload.content || []);
    } catch (err) {
      console.error('Fetch first aid approval history error:', err);
      setHistoryRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openDetail = async (row) => {
    try {
      const res = await firstAidGuideService.getById(row.guideId);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err) {
      toast.error(err, { title: 'Lỗi tải chi tiết sơ cứu' });
    }
  };

  const openEdit = (row) => {
    const id = getGuideId(row);
    if (!id) return;
    navigate(`/medical/${id}/edit`);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const columns = [
    {
      key: 'guideTitle',
      header: 'Tiêu đề',
      render: (row) => <span className="font-medium text-foreground">{row.guideTitle}</span>,
    },
    { key: 'emergencyType', header: 'Loại tình huống' },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'w-36',
      render: (row) => (row.status ? <StatusBadge status={row.status} /> : '—'),
    },
    {
      key: 'updatedAt',
      header: 'Cập nhật',
      className: 'w-44',
      render: (row) => {
        const parts = getDateTimeParts(row.updatedAt);
        if (!parts) return '—';
        return (
          <div className="leading-tight">
            <div className="text-sm font-medium text-foreground">{parts.time}</div>
            <div className="text-xs text-muted-foreground">{parts.date}</div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-48',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" title="Lịch sử duyệt" onClick={() => openHistory(row)}><History className="h-4 w-4 text-muted-foreground" /></Button>
          {canShowEdit(row) && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>}
          {canDelete && <Button variant="ghost" size="sm" title="Xóa" onClick={() => setDeleteId(getGuideId(row))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          {canEdit && ['DRAFT', 'REJECTED'].includes(getStatus(row)) && (
            <Button variant="ghost" size="sm" title="Gửi duyệt" onClick={() => handleSubmitForReview(row)}><Send className="h-4 w-4 text-amber-600" /></Button>
          )}
          {canPublish && getStatus(row) === 'APPROVED' && (
            <Button variant="ghost" size="sm" title="Xuất bản" onClick={() => handlePublish(row)}><Globe className="h-4 w-4 text-emerald-600" /></Button>
          )}
          {canPublish && getStatus(row) === 'PUBLISHED' && (
            <Button variant="ghost" size="sm" title="Gỡ xuất bản" onClick={() => handleUnpublish(row)}><Undo2 className="h-4 w-4 text-muted-foreground" /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quản lý Sơ cứu"
        description="Danh sách hướng dẫn sơ cứu cho các tình huống khẩn cấp"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Sơ cứu' }]}
        actions={canEdit ? <Button onClick={() => navigate('/medical/create')} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none"><Plus className="h-4 w-4" />Tạo hướng dẫn sơ cứu</Button> : null}
      />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm tiêu đề..."
            className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <FilterSelect value={status} onChange={(value) => setStatus(value)} options={statusOptions} className="w-48" />
      </div>

      <DataTable
        columns={columns}
        data={guides}
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.total}
        onPageChange={(p) => fetchData(p, pagination.pageSize)}
        onPageSizeChange={(s) => {
          setPagination((prev) => ({ ...prev, pageSize: s }));
          fetchData(0, s);
        }}
        emptyMessage="Chưa có hướng dẫn sơ cứu nào"
      />

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Chi tiết hướng dẫn sơ cứu" width={700}>
        {detailData && (
          <div className="space-y-3">
            {[
              ['Tiêu đề', detailData.guideTitle],
              ['Loại tình huống', detailData.emergencyType],
              ['Mô tả', detailData.description],
              ['Các bước xử lý ngay', detailData.immediateSteps],
              ['Vật tư cần thiết', detailData.requiredMaterials],
              ['Không nên làm', detailData.doNotActions],
              ['Khi nào cần bác sĩ', detailData.whenToSeekVet],
              ['Trạng thái', getStatusLabel(detailData.status)],
              ['Người tạo', detailData.createdByName],
              ['Ngày tạo', formatDateTime(detailData.createdAt)],
              ['Cập nhật', formatDateTime(detailData.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground whitespace-pre-line break-words">{value || '—'}</span>
              </div>
            ))}
            <EntityMediaPreview
              entityType={APPROVAL_ENTITY_TYPES.FIRST_AID_GUIDE}
              entityId={detailData?.guideId}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa hướng dẫn sơ cứu' : 'Thêm hướng dẫn sơ cứu'}
        width={700}
        footer={(
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button>
          </>
        )}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Tiêu đề" required>
            <FormInput
              placeholder="VD: Sơ cứu khi chó bị say nắng"
              value={formData.guideTitle}
              onChange={(e) => updateField('guideTitle', e.target.value)}
            />
          </FormField>

          <FormField label="Loại tình huống" required>
            <FormInput
              placeholder="VD: Heat Stroke"
              value={formData.emergencyType}
              onChange={(e) => updateField('emergencyType', e.target.value)}
            />
          </FormField>

          <FormField label="Mô tả">
            <FormTextarea
              rows={3}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </FormField>

          <FormField label="Các bước xử lý ngay" required>
            <FormTextarea
              rows={4}
              value={formData.immediateSteps}
              onChange={(e) => updateField('immediateSteps', e.target.value)}
            />
          </FormField>

          <FormField label="Vật tư cần thiết">
            <FormTextarea
              rows={2}
              value={formData.requiredMaterials}
              onChange={(e) => updateField('requiredMaterials', e.target.value)}
            />
          </FormField>

          <FormField label="Không nên làm">
            <FormTextarea
              rows={2}
              value={formData.doNotActions}
              onChange={(e) => updateField('doNotActions', e.target.value)}
            />
          </FormField>

          <FormField label="Khi nào cần bác sĩ thú y">
            <FormTextarea
              rows={2}
              value={formData.whenToSeekVet}
              onChange={(e) => updateField('whenToSeekVet', e.target.value)}
            />
          </FormField>

        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xóa hướng dẫn sơ cứu"
        description="Bạn có chắc chắn muốn xóa hướng dẫn này?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
      />
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

export default FirstAidGuidesPage;
