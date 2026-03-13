import { useEffect, useState } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import StatusBadge from '../../components/shared/StatusBadge';
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
import { Plus, Pencil, Trash2, Eye, Search } from 'lucide-react';

const EMPTY_FORM = {
  guideTitle: '',
  emergencyType: '',
  description: '',
  immediateSteps: '',
  requiredMaterials: '',
  doNotActions: '',
  whenToSeekVet: '',
  imageUrl: '',
};

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'PUBLISHED', label: 'Đã xuất bản' },
];

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const FirstAidGuidesPage = () => {
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

  const fetchData = async (page = 0, size = pagination.pageSize) => {
    setLoading(true);
    try {
      const statusQuery = status === 'all' ? '' : status;
      const res = await firstAidGuideService.getAll(page, size, search, statusQuery);
      setGuides(res.data?.content || []);
      setPagination((prev) => ({
        ...prev,
        page,
        total: res.data?.totalElements || 0,
      }));
    } catch (err) {
      toast.error('Lỗi tải danh sách sơ cứu');
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
    imageUrl: formData.imageUrl?.trim() || '',
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
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) {
      toast.error(err?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await firstAidGuideService.delete(deleteId);
      toast.success('Xóa thành công');
      setDeleteId(null);
      fetchData(pagination.page, pagination.pageSize);
    } catch (err) {
      toast.error('Lỗi khi xóa sơ cứu');
    }
  };

  const openDetail = async (row) => {
    try {
      const res = await firstAidGuideService.getById(row.guideId);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err) {
      toast.error('Lỗi tải chi tiết sơ cứu');
    }
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      guideTitle: row.guideTitle || '',
      emergencyType: row.emergencyType || '',
      description: row.description || '',
      immediateSteps: row.immediateSteps || '',
      requiredMaterials: row.requiredMaterials || '',
      doNotActions: row.doNotActions || '',
      whenToSeekVet: row.whenToSeekVet || '',
      imageUrl: row.imageUrl || '',
    });
    setModalOpen(true);
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
    { key: 'guideId', header: 'ID', className: 'w-16' },
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
      render: (row) => formatDateTime(row.updatedAt),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-36',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(row)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteId(row.guideId)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Thêm mới</Button>}
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
              ['Ảnh minh họa', detailData.imageUrl],
              ['Trạng thái', detailData.status],
              ['Người tạo', detailData.createdByName],
              ['Ngày tạo', formatDateTime(detailData.createdAt)],
              ['Cập nhật', formatDateTime(detailData.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground whitespace-pre-line break-words">{value || '—'}</span>
              </div>
            ))}
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

          <FormField label="URL ảnh minh họa">
            <FormInput
              placeholder="https://..."
              value={formData.imageUrl}
              onChange={(e) => updateField('imageUrl', e.target.value)}
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
    </div>
  );
};

export default FirstAidGuidesPage;
