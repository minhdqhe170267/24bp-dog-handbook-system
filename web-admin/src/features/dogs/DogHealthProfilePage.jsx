import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Eye, Pencil, PlusCircle, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import {
  Button,
  Modal,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
} from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { dogService } from '../../services/dogService';
import { healthRecordService } from '../../services/healthRecordService';
import { healthSessionService } from '../../services/healthSessionService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const two = (n) => String(n).padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
};

const toDatetimeLocal = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
};

const toDateOnly = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};

const truncate = (text, max = 60) => {
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

// ─── Inline badge helpers ────────────────────────────────────────────────────

const appetiteConfig = {
  NORMAL: { label: 'Bình thường', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25' },
  INCREASED: { label: 'Tăng', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25' },
  DECREASED: { label: 'Giảm', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25' },
  NONE: { label: 'Bỏ ăn', className: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/25' },
};

const activityConfig = {
  VERY_LOW: { label: 'Rất ít', className: 'bg-gray-500/10 text-gray-500 dark:text-gray-300 border-gray-500/25' },
  NORMAL: { label: 'Bình thường', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25' },
  HYPERACTIVE: { label: 'Tăng động', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/25' },
};

const fecesConfig = {
  NORMAL: { label: 'Bình thường', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25' },
  ABNORMAL: { label: 'Bất thường', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25' },
  BLOOD_PRESENT: { label: 'Có máu', className: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/25' },
};

const sessionStatusConfig = {
  ACTIVE: { label: 'Đang theo dõi', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25' },
  RESOLVED: { label: 'Đã giải quyết', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25' },
  CLOSED: { label: 'Đã đóng', className: 'bg-gray-500/10 text-gray-500 dark:text-gray-300 border-gray-500/25' },
};

const InlineBadge = ({ config, value }) => {
  const cfg = config[value] || { label: value || '—', className: 'bg-gray-500/10 text-gray-500 dark:text-gray-300 border-gray-500/25' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

// ─── Severity badge (reuse StatusBadge which handles LOW/MEDIUM/HIGH/CRITICAL) ─

// ─── Options ────────────────────────────────────────────────────────────────

const fecesOptions = [
  { value: 'NORMAL', label: 'Bình thường' },
  { value: 'ABNORMAL', label: 'Bất thường' },
  { value: 'BLOOD_PRESENT', label: 'Có máu' },
];

const appetiteOptions = [
  { value: 'NORMAL', label: 'Bình thường' },
  { value: 'INCREASED', label: 'Tăng' },
  { value: 'DECREASED', label: 'Giảm' },
  { value: 'NONE', label: 'Bỏ ăn' },
];

const activityOptions = [
  { value: 'VERY_LOW', label: 'Rất ít' },
  { value: 'NORMAL', label: 'Bình thường' },
  { value: 'HYPERACTIVE', label: 'Tăng động' },
];

const severityOptions = [
  { value: 'LOW', label: 'Nhẹ' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Nặng' },
  { value: 'CRITICAL', label: 'Nguy hiểm' },
];

// ─── Default forms ────────────────────────────────────────────────────────────

const defaultRecordForm = {
  weightKg: '',
  temperatureC: '',
  fecesStatus: 'NORMAL',
  appetiteLevel: 'NORMAL',
  activityLevel: 'NORMAL',
  observedSymptoms: '',
  diagnosis: '',
  treatmentGiven: '',
  nextCheckupDate: '',
  notes: '',
};

const defaultSessionForm = {
  issueSummary: '',
  severity: 'LOW',
  followUpDate: '',
  notes: '',
};

const defaultFollowUpForm = {
  followUpDate: '',
  statusUpdate: '',
  weightKg: '',
  temperatureC: '',
  nextSteps: '',
  notes: '',
};

// ─── HealthRecordsTab ────────────────────────────────────────────────────────

const HealthRecordsTab = ({ dogId }) => {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(defaultRecordForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await healthRecordService.getByDog(dogId, page, size);
      const data = res.data;
      setRecords(data?.content || []);
      setPagination((prev) => ({ ...prev, page: data?.number ?? page, total: data?.totalElements ?? 0 }));
    } catch (error) {
      toast.error(error, { title: 'Không tải được hồ sơ khám' });
    } finally {
      setLoading(false);
    }
  }, [dogId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchRecords(0, pagination.pageSize); }, [fetchRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setFormData(defaultRecordForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      weightKg: row.weightKg ?? '',
      temperatureC: row.temperatureC ?? '',
      fecesStatus: row.fecesStatus || 'NORMAL',
      appetiteLevel: row.appetiteLevel || 'NORMAL',
      activityLevel: row.activityLevel || 'NORMAL',
      observedSymptoms: row.observedSymptoms || '',
      diagnosis: row.diagnosis || '',
      treatmentGiven: row.treatmentGiven || '',
      nextCheckupDate: toDateOnly(row.nextCheckupDate),
      notes: row.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        dogId: Number(dogId),
        weightKg: formData.weightKg !== '' ? Number(formData.weightKg) : null,
        temperatureC: formData.temperatureC !== '' ? Number(formData.temperatureC) : null,
        fecesStatus: formData.fecesStatus || null,
        appetiteLevel: formData.appetiteLevel || null,
        activityLevel: formData.activityLevel || null,
        observedSymptoms: formData.observedSymptoms?.trim() || null,
        diagnosis: formData.diagnosis?.trim() || null,
        treatmentGiven: formData.treatmentGiven?.trim() || null,
        nextCheckupDate: formData.nextCheckupDate || null,
        notes: formData.notes?.trim() || null,
      };
      if (editing) {
        await healthRecordService.update(editing.recordId || editing.id, payload);
        toast.success('Cập nhật hồ sơ khám thành công');
      } else {
        await healthRecordService.create(payload);
        toast.success('Tạo hồ sơ khám thành công');
      }
      setModalOpen(false);
      setEditing(null);
      fetchRecords(0, pagination.pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể lưu hồ sơ khám' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'examinationDate',
      header: 'Ngày khám',
      className: 'w-36',
      render: (row) => formatDateTime(row.examinationDate),
    },
    {
      key: 'weightKg',
      header: 'Cân nặng (kg)',
      className: 'w-28',
      render: (row) => (row.weightKg != null ? `${row.weightKg} kg` : '—'),
    },
    {
      key: 'temperatureC',
      header: 'Thân nhiệt (°C)',
      className: 'w-32',
      render: (row) => (row.temperatureC != null ? `${row.temperatureC}°C` : '—'),
    },
    {
      key: 'appetiteLevel',
      header: 'Mức ăn',
      className: 'w-32',
      render: (row) => <InlineBadge config={appetiteConfig} value={row.appetiteLevel} />,
    },
    {
      key: 'activityLevel',
      header: 'Hoạt động',
      className: 'w-32',
      render: (row) => <InlineBadge config={activityConfig} value={row.activityLevel} />,
    },
    {
      key: 'fecesStatus',
      header: 'Phân',
      className: 'w-36',
      render: (row) => <InlineBadge config={fecesConfig} value={row.fecesStatus} />,
    },
    {
      key: 'observedSymptoms',
      header: 'Triệu chứng',
      render: (row) => <span title={row.observedSymptoms || ''}>{truncate(row.observedSymptoms)}</span>,
    },
    {
      key: 'nextCheckupDate',
      header: 'Khám tiếp',
      className: 'w-28',
      render: (row) => formatDate(row.nextCheckupDate),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-24',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="Sửa">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Lịch sử các lần khám sức khỏe của chó
        </p>
        <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none">
          <Plus className="h-4 w-4" />
          Thêm hồ sơ khám
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.total}
        onPageChange={(p) => fetchRecords(p, pagination.pageSize)}
        onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchRecords(0, s); }}
        emptyMessage="Chưa có hồ sơ khám nào"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa hồ sơ khám' : 'Thêm hồ sơ khám'}
        width={780}
        footer={(
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit} loading={submitting}>{editing ? 'Cập nhật' : 'Tạo mới'}</Button>
          </>
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Ngày khám tiếp theo">
            <FormInput
              type="date"
              value={formData.nextCheckupDate}
              onChange={(e) => updateField('nextCheckupDate', e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Cân nặng (kg)">
            <FormInput
              type="number"
              min="0"
              max="200"
              step="0.1"
              value={formData.weightKg}
              onChange={(e) => updateField('weightKg', e.target.value)}
              placeholder="VD: 25.5"
            />
          </FormField>
          <FormField label="Thân nhiệt (°C)">
            <FormInput
              type="number"
              min="30"
              max="45"
              step="0.1"
              value={formData.temperatureC}
              onChange={(e) => updateField('temperatureC', e.target.value)}
              placeholder="VD: 38.5"
            />
          </FormField>
          <FormField label="Tình trạng phân">
            <FormSelect
              value={formData.fecesStatus}
              onChange={(e) => updateField('fecesStatus', e.target.value)}
              options={fecesOptions}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Mức ăn">
            <FormSelect
              value={formData.appetiteLevel}
              onChange={(e) => updateField('appetiteLevel', e.target.value)}
              options={appetiteOptions}
            />
          </FormField>
          <FormField label="Mức hoạt động">
            <FormSelect
              value={formData.activityLevel}
              onChange={(e) => updateField('activityLevel', e.target.value)}
              options={activityOptions}
            />
          </FormField>
        </div>

        <FormField label="Triệu chứng quan sát">
          <FormTextarea
            rows={3}
            maxLength={1000}
            value={formData.observedSymptoms}
            onChange={(e) => updateField('observedSymptoms', e.target.value)}
            placeholder="Mô tả các triệu chứng quan sát được..."
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField label="Chẩn đoán">
            <FormTextarea
              rows={3}
              maxLength={1000}
              value={formData.diagnosis}
              onChange={(e) => updateField('diagnosis', e.target.value)}
              placeholder="Chẩn đoán của bác sĩ thú y..."
            />
          </FormField>
          <FormField label="Điều trị">
            <FormTextarea
              rows={3}
              maxLength={1000}
              value={formData.treatmentGiven}
              onChange={(e) => updateField('treatmentGiven', e.target.value)}
              placeholder="Phương pháp điều trị..."
            />
          </FormField>
        </div>

        <FormField label="Ghi chú">
          <FormTextarea
            rows={2}
            maxLength={500}
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
          />
        </FormField>
      </Modal>
    </div>
  );
};

// ─── HealthSessionsTab ───────────────────────────────────────────────────────

const HealthSessionsTab = ({ dogId }) => {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [detailSession, setDetailSession] = useState(null);
  const [followUpSession, setFollowUpSession] = useState(null);
  const [resolveSession, setResolveSession] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState(defaultSessionForm);
  const [followUpForm, setFollowUpForm] = useState(defaultFollowUpForm);
  const [resolveNotes, setResolveNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Session detail (enriched with follow-ups)
  const [sessionDetail, setSessionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSessions = useCallback(async (page = 0, size = 10) => {
    setLoading(true);
    try {
      const res = await healthSessionService.getByDog(dogId, page, size);
      const data = res.data;
      setSessions(data?.content || []);
      setPagination((prev) => ({ ...prev, page: data?.number ?? page, total: data?.totalElements ?? 0 }));
    } catch (error) {
      toast.error(error, { title: 'Không tải được phiên theo dõi' });
    } finally {
      setLoading(false);
    }
  }, [dogId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSessions(0, pagination.pageSize); }, [fetchSessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCreateField = (key, value) => setCreateForm((prev) => ({ ...prev, [key]: value }));
  const updateFollowUpField = (key, value) => setFollowUpForm((prev) => ({ ...prev, [key]: value }));

  const openDetail = async (row) => {
    setDetailSession(row);
    setDetailLoading(true);
    try {
      const res = await healthSessionService.getById(row.id || row.sessionId);
      setSessionDetail(res.data);
    } catch {
      setSessionDetail(row);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!createForm.issueSummary?.trim()) {
      toast.error({ title: 'Vui lòng nhập tóm tắt vấn đề' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        dogId,
        issueSummary: createForm.issueSummary.trim(),
        severity: createForm.severity || 'LOW',
        followUpDate: createForm.followUpDate || null,
        notes: createForm.notes?.trim() || null,
      };
      await healthSessionService.create(payload);
      toast.success('Tạo phiên theo dõi thành công');
      setCreateOpen(false);
      setCreateForm(defaultSessionForm);
      fetchSessions(0, pagination.pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể tạo phiên theo dõi' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpSession) return;
    setSubmitting(true);
    try {
      const payload = {
        followUpDate: followUpForm.followUpDate ? new Date(followUpForm.followUpDate).toISOString() : null,
        statusUpdate: followUpForm.statusUpdate?.trim() || null,
        weightKg: followUpForm.weightKg !== '' ? Number(followUpForm.weightKg) : null,
        temperatureC: followUpForm.temperatureC !== '' ? Number(followUpForm.temperatureC) : null,
        nextSteps: followUpForm.nextSteps?.trim() || null,
        notes: followUpForm.notes?.trim() || null,
      };
      await healthSessionService.addFollowUp(followUpSession.id || followUpSession.sessionId, payload);
      toast.success('Thêm follow-up thành công');
      setFollowUpSession(null);
      setFollowUpForm(defaultFollowUpForm);
      fetchSessions(pagination.page, pagination.pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể thêm follow-up' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveSession) return;
    setSubmitting(true);
    try {
      await healthSessionService.resolve(resolveSession.id || resolveSession.sessionId, { resolutionNotes: resolveNotes?.trim() || null });
      toast.success('Đã resolve phiên theo dõi');
      setResolveSession(null);
      setResolveNotes('');
      fetchSessions(pagination.page, pagination.pageSize);
    } catch (error) {
      toast.error(error, { title: 'Không thể resolve phiên theo dõi' });
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'startedAt',
      header: 'Ngày bắt đầu',
      className: 'w-36',
      render: (row) => formatDateTime(row.startedAt),
    },
    {
      key: 'issueSummary',
      header: 'Vấn đề',
      render: (row) => <span title={row.issueSummary || ''}>{truncate(row.issueSummary)}</span>,
    },
    {
      key: 'severity',
      header: 'Mức độ',
      className: 'w-28',
      render: (row) => <StatusBadge status={row.severity} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'w-36',
      render: (row) => <InlineBadge config={sessionStatusConfig} value={row.status} />,
    },
    {
      key: 'trainer',
      header: 'Trainer',
      className: 'w-36',
      render: (row) => row.trainer?.fullName || '—',
    },
    {
      key: 'followUpDate',
      header: 'Theo dõi tiếp',
      className: 'w-28',
      render: (row) => formatDate(row.followUpDate),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-36',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(row)} title="Xem chi tiết">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFollowUpSession(row); setFollowUpForm(defaultFollowUpForm); }}
            title="Thêm follow-up"
            disabled={row.status === 'RESOLVED' || row.status === 'CLOSED'}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setResolveSession(row); setResolveNotes(''); }}
            title="Resolve phiên"
            disabled={row.status === 'RESOLVED' || row.status === 'CLOSED'}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Các phiên theo dõi sức khỏe của chó
        </p>
        <Button onClick={() => { setCreateOpen(true); setCreateForm(defaultSessionForm); }} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-none">
          <Plus className="h-4 w-4" />
          Tạo phiên theo dõi
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.total}
        onPageChange={(p) => fetchSessions(p, pagination.pageSize)}
        onPageSizeChange={(s) => { setPagination((prev) => ({ ...prev, pageSize: s })); fetchSessions(0, s); }}
        emptyMessage="Chưa có phiên theo dõi nào"
      />

      {/* Create Session Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo phiên theo dõi sức khỏe"
        width={560}
        footer={(
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateSession} loading={submitting}>Tạo mới</Button>
          </>
        )}
      >
        <FormField label="Tóm tắt vấn đề" required>
          <FormTextarea
            rows={4}
            maxLength={500}
            value={createForm.issueSummary}
            onChange={(e) => updateCreateField('issueSummary', e.target.value)}
            placeholder="Mô tả vấn đề sức khỏe cần theo dõi..."
          />
        </FormField>
        <FormField label="Mức độ nghiêm trọng">
          <FormSelect
            value={createForm.severity}
            onChange={(e) => updateCreateField('severity', e.target.value)}
            options={severityOptions}
          />
        </FormField>
        <FormField label="Ngày theo dõi tiếp theo">
          <FormInput
            type="date"
            value={createForm.followUpDate}
            onChange={(e) => updateCreateField('followUpDate', e.target.value)}
          />
        </FormField>
        <FormField label="Ghi chú">
          <FormTextarea
            rows={2}
            maxLength={500}
            value={createForm.notes}
            onChange={(e) => updateCreateField('notes', e.target.value)}
          />
        </FormField>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        open={!!detailSession}
        onClose={() => { setDetailSession(null); setSessionDetail(null); }}
        title="Chi tiết phiên theo dõi"
        width={680}
      >
        {detailLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : sessionDetail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/40 border border-border/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ngày bắt đầu</p>
                <p className="text-sm font-medium">{formatDateTime(sessionDetail.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Mức độ</p>
                <StatusBadge status={sessionDetail.severity} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
                <InlineBadge config={sessionStatusConfig} value={sessionDetail.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Theo dõi tiếp</p>
                <p className="text-sm font-medium">{formatDate(sessionDetail.followUpDate)}</p>
              </div>
              {sessionDetail.trainer && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trainer</p>
                  <p className="text-sm font-medium">{sessionDetail.trainer.fullName}</p>
                </div>
              )}
              {sessionDetail.resolvedAt && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ngày giải quyết</p>
                  <p className="text-sm font-medium">{formatDateTime(sessionDetail.resolvedAt)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Tóm tắt vấn đề</p>
              <p className="text-sm bg-muted/30 rounded-lg p-3 border border-border/40">{sessionDetail.issueSummary || '—'}</p>
            </div>

            {sessionDetail.resolutionNotes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ghi chú giải quyết</p>
                <p className="text-sm bg-muted/30 rounded-lg p-3 border border-border/40">{sessionDetail.resolutionNotes}</p>
              </div>
            )}

            {/* Follow-up timeline */}
            {sessionDetail.followUps?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Lịch sử follow-up ({sessionDetail.followUps.length})</p>
                <div className="space-y-3">
                  {sessionDetail.followUps.map((fu, idx) => (
                    <div key={fu.id || idx} className="relative pl-6 border-l-2 border-accent/30 ml-2">
                      <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-accent/20 border-2 border-accent flex-shrink-0" />
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                        <p className="text-xs text-muted-foreground mb-1">{formatDateTime(fu.followUpDate)}</p>
                        {fu.statusUpdate && (
                          <p className="text-sm mb-1"><span className="font-medium">Cập nhật: </span>{fu.statusUpdate}</p>
                        )}
                        {(fu.weightKg != null || fu.temperatureC != null) && (
                          <p className="text-xs text-muted-foreground">
                            {fu.weightKg != null && `Cân nặng: ${fu.weightKg} kg`}
                            {fu.weightKg != null && fu.temperatureC != null && ' · '}
                            {fu.temperatureC != null && `Thân nhiệt: ${fu.temperatureC}°C`}
                          </p>
                        )}
                        {fu.nextSteps && <p className="text-sm mt-1"><span className="font-medium">Bước tiếp: </span>{fu.nextSteps}</p>}
                        {fu.notes && <p className="text-xs text-muted-foreground mt-1">{fu.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Add Follow-up Modal */}
      <Modal
        open={!!followUpSession}
        onClose={() => setFollowUpSession(null)}
        title="Thêm follow-up"
        width={560}
        footer={(
          <>
            <Button variant="outline" onClick={() => setFollowUpSession(null)}>Hủy</Button>
            <Button onClick={handleAddFollowUp} loading={submitting}>Lưu follow-up</Button>
          </>
        )}
      >
        <FormField label="Ngày follow-up">
          <FormInput
            type="datetime-local"
            value={followUpForm.followUpDate}
            onChange={(e) => updateFollowUpField('followUpDate', e.target.value)}
          />
        </FormField>
        <FormField label="Cập nhật trạng thái">
          <FormTextarea
            rows={3}
            maxLength={500}
            value={followUpForm.statusUpdate}
            onChange={(e) => updateFollowUpField('statusUpdate', e.target.value)}
            placeholder="Mô tả tình trạng hiện tại..."
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Cân nặng (kg)">
            <FormInput
              type="number"
              min="0"
              max="200"
              step="0.1"
              value={followUpForm.weightKg}
              onChange={(e) => updateFollowUpField('weightKg', e.target.value)}
              placeholder="VD: 25.5"
            />
          </FormField>
          <FormField label="Thân nhiệt (°C)">
            <FormInput
              type="number"
              min="30"
              max="45"
              step="0.1"
              value={followUpForm.temperatureC}
              onChange={(e) => updateFollowUpField('temperatureC', e.target.value)}
              placeholder="VD: 38.5"
            />
          </FormField>
        </div>
        <FormField label="Bước tiếp theo">
          <FormTextarea
            rows={2}
            maxLength={500}
            value={followUpForm.nextSteps}
            onChange={(e) => updateFollowUpField('nextSteps', e.target.value)}
          />
        </FormField>
        <FormField label="Ghi chú">
          <FormTextarea
            rows={2}
            maxLength={500}
            value={followUpForm.notes}
            onChange={(e) => updateFollowUpField('notes', e.target.value)}
          />
        </FormField>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        open={!!resolveSession}
        onClose={() => setResolveSession(null)}
        title="Resolve phiên theo dõi"
        width={480}
        footer={(
          <>
            <Button variant="outline" onClick={() => setResolveSession(null)}>Hủy</Button>
            <Button variant="success" onClick={handleResolve} loading={submitting}>
              <CheckCircle2 className="h-4 w-4" />
              Xác nhận resolve
            </Button>
          </>
        )}
      >
        <p className="text-sm text-muted-foreground mb-4">
          Bạn đang đánh dấu phiên theo dõi này là đã giải quyết. Hãy ghi chú kết quả nếu cần.
        </p>
        <FormField label="Ghi chú kết thúc">
          <FormTextarea
            rows={4}
            maxLength={500}
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            placeholder="Tình trạng khi đóng phiên theo dõi..."
          />
        </FormField>
      </Modal>
    </div>
  );
};

// ─── Dog Info Header ─────────────────────────────────────────────────────────

const dogStatusConfig = {
  ACTIVE: { label: 'Hoạt động', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25' },
  INACTIVE: { label: 'Ngừng hoạt động', className: 'bg-gray-500/10 text-gray-500 dark:text-gray-300 border-gray-500/25' },
  RETIRED: { label: 'Nghỉ hưu', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25' },
  DECEASED: { label: 'Đã mất', className: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/25' },
  TRANSFERRED: { label: 'Chuyển đơn vị', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/25' },
};

const DogInfoHeader = ({ dog }) => {
  if (!dog) return null;
  const statusCfg = dogStatusConfig[dog.status] || { label: dog.status, className: 'bg-gray-500/10 text-gray-500 dark:text-gray-300 border-gray-500/25' };
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl border border-border/60 bg-card mb-6">
      {dog.avatarUrl ? (
        <img src={dog.avatarUrl} alt={dog.dogName} className="h-16 w-16 rounded-full object-cover border-2 border-border/40 flex-shrink-0" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-accent">{(dog.dogName || '?')[0].toUpperCase()}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-foreground">{dog.dogName || '—'}</h2>
          {dog.dogCode && (
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {dog.dogCode}
            </span>
          )}
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap text-sm text-muted-foreground">
          {dog.breedName && <span>Giống: <strong className="text-foreground">{dog.breedName}</strong></span>}
          {dog.currentWeightKg != null && <span>Cân nặng: <strong className="text-foreground">{dog.currentWeightKg} kg</strong></span>}
          {dog.gender && <span>Giới tính: <strong className="text-foreground">{dog.gender === 'FEMALE' ? 'Cái' : 'Đực'}</strong></span>}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'records', label: 'Hồ sơ khám sức khỏe' },
];

const DogHealthProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [dog, setDog] = useState(null);
  const [dogLoading, setDogLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('records');

  useEffect(() => {
    const fetchDog = async () => {
      setDogLoading(true);
      try {
        const res = await dogService.getById(id);
        setDog(res.data);
      } catch (error) {
        toast.error(error, { title: 'Không tải được thông tin chó' });
      } finally {
        setDogLoading(false);
      }
    };
    fetchDog();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Hồ sơ sức khỏe"
        description={dog ? `Quản lý sức khỏe của chó ${dog.dogName}` : 'Đang tải...'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Hồ sơ chó', href: '/dogs' },
          { label: dog ? dog.dogName : '...' },
          { label: 'Sức khỏe' },
        ]}
        actions={(
          <Button variant="outline" onClick={() => navigate('/dogs')}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </Button>
        )}
      />

      {dogLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <DogInfoHeader dog={dog} />

          {/* Tab navigation */}
          <div className="border-b border-border/60 mb-6">
            <div className="flex gap-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'px-5 py-3 text-sm font-medium transition-all duration-200 border-b-2 cursor-pointer bg-transparent -mb-px',
                    activeTab === tab.key
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'records' && <HealthRecordsTab dogId={id} />}
          {activeTab === 'sessions' && <HealthSessionsTab dogId={id} />}
        </>
      )}
    </div>
  );
};

export default DogHealthProfilePage;
