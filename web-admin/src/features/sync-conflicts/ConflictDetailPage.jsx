import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, GitMerge, Loader2, ShieldCheck, UserCog } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { Button, ConfirmDialog, FormTextarea } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import syncConflictService from '../../services/syncConflictService';
import ConflictStatusTag from './components/ConflictStatusTag';
import ConflictDiffView from './components/ConflictDiffView';
import { getAllFieldKeys, normalizeFieldKey } from './components/conflictDiffUtils';

const ENTITY_TYPE_LABELS = {
  HEALTH_RECORD: 'Hồ sơ sức khỏe',
  FIELD_NOTE: 'Ghi chú thực địa',
  CONTENT_SUGGESTION: 'Góp ý nội dung',
};

const RESOLUTION_LABELS = {
  KEEP_SERVER: 'Giữ bản hệ thống',
  KEEP_LOCAL: 'Giữ bản trainer',
  MERGED: 'Đã merge thủ công',
};

const RESOLUTION_SOURCE_LABELS = {
  local: 'Trainer',
  server: 'Hệ thống',
};

const normalizeEntityType = (value) =>
  String(value || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getEntityTypeLabel = (value) => {
  const normalized = normalizeEntityType(value);
  return ENTITY_TYPE_LABELS[normalized] || normalized || '—';
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
};

const parseDateSort = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const ConflictDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view');
  const [selections, setSelections] = useState({});
  const [note, setNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [confirmType, setConfirmType] = useState(null);
  const backToListPath = useMemo(() => {
    const fromState = String(location.state?.returnTo || '').trim();
    if (fromState === '/admin/sync-conflicts' || fromState === '/sync-conflicts') return fromState;

    const search = new URLSearchParams(location.search);
    const fromQuery = String(search.get('returnTo') || '').trim();
    if (fromQuery === '/admin/sync-conflicts' || fromQuery === '/sync-conflicts') return fromQuery;

    return '/sync-conflicts';
  }, [location.search, location.state?.returnTo]);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await syncConflictService.getConflictDetail(id);
      const payload = res?.data || res || null;
      setDetail(payload);
    } catch (error) {
      toast.error(error, { title: 'Không tải được chi tiết xung đột' });
      if (error?.status === 403) navigate('/dashboard', { replace: true });
      else navigate(backToListPath, { replace: true });
    } finally {
      setLoading(false);
    }
  }, [backToListPath, id, navigate, toast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const isPending = String(detail?.status || '').toUpperCase() === 'PENDING';
  const conflictedFieldSet = useMemo(
    () => new Set((detail?.conflictedFields || []).map((field) => normalizeFieldKey(field))),
    [detail?.conflictedFields]
  );

  const allDisplayFields = useMemo(
    () => getAllFieldKeys(detail?.localData || {}, detail?.serverData || {}, detail?.mergedData || null),
    [detail?.localData, detail?.mergedData, detail?.serverData]
  );

  const enterMergeMode = () => {
    const initialSelections = {};
    allDisplayFields.forEach((field) => {
      if (conflictedFieldSet.has(normalizeFieldKey(field))) {
        initialSelections[field] = null;
      }
    });
    setSelections(initialSelections);
    setMode('merge');
  };

  const cancelMergeMode = () => {
    setMode('view');
    setSelections({});
  };

  const allConflictedFieldsSelected = useMemo(() => {
    const conflictedFields = allDisplayFields.filter((field) =>
      conflictedFieldSet.has(normalizeFieldKey(field))
    );
    if (conflictedFields.length === 0) return false;
    return conflictedFields.every((field) => {
      const direct = selections[field];
      const normalized = selections[normalizeFieldKey(field)];
      return direct === 'local' || direct === 'server' || normalized === 'local' || normalized === 'server';
    });
  }, [allDisplayFields, conflictedFieldSet, selections]);

  const buildMergedData = useCallback(() => {
    const localData = detail?.localData || {};
    const serverData = detail?.serverData || {};
    const merged = {};
    allDisplayFields.forEach((field) => {
      const normalizedField = normalizeFieldKey(field);
      if (conflictedFieldSet.has(normalizedField)) {
        const selected = selections[field] || selections[normalizedField];
        merged[field] = selected === 'local' ? localData[field] : serverData[field];
      } else {
        merged[field] = localData[field] ?? serverData[field];
      }
    });
    return merged;
  }, [allDisplayFields, conflictedFieldSet, detail?.localData, detail?.serverData, selections]);

  const mergePreview = useMemo(() => {
    if (mode !== 'merge') return null;
    return buildMergedData();
  }, [buildMergedData, mode]);

  const resolveConflict = async (resolutionType) => {
    if (!detail?.id || resolving) return;
    if (resolutionType === 'MERGED' && !allConflictedFieldsSelected) {
      toast.warning('Vui lòng chọn đầy đủ giá trị cho các trường xung đột');
      return;
    }

    setResolving(true);
    try {
      const body = {
        resolutionType,
        resolutionNote: note.trim() || undefined,
      };
      if (resolutionType === 'MERGED') {
        body.mergedData = buildMergedData();
      }

      await syncConflictService.resolveConflict(detail.id, body);
      const successMessages = {
        KEEP_SERVER: 'Đã giữ bản hệ thống',
        KEEP_LOCAL: 'Đã dùng bản trainer',
        MERGED: 'Đã merge thành công',
      };
      toast.success(successMessages[resolutionType] || 'Đã xử lý xung đột');
      window.dispatchEvent(new Event('sync-conflicts:refresh-count'));
      navigate(backToListPath, { replace: true });
    } catch (error) {
      toast.error(error, { title: 'Không thể xử lý xung đột' });
    } finally {
      setResolving(false);
      setConfirmType(null);
    }
  };

  const renderMergedPreviewRows = () => {
    if (!mergePreview) return null;
    const rows = allDisplayFields.map((field) => {
      const normalized = normalizeFieldKey(field);
      const isConflicted = conflictedFieldSet.has(normalized);
      const selected = selections[field] || selections[normalized];
      const source = isConflicted ? selected : 'local';
      return {
        field,
        value: mergePreview[field],
        source: source || null,
      };
    });

    return rows
      .sort((left, right) => {
        const leftTime = parseDateSort(left.value);
        const rightTime = parseDateSort(right.value);
        if (leftTime !== rightTime) return rightTime - leftTime;
        return left.field.localeCompare(right.field, 'vi');
      })
      .map((item) => (
        <div key={item.field} className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0">
          <div>
            <p className="text-sm font-medium text-foreground">{item.field}</p>
            <p className="text-xs text-muted-foreground break-words">
              {item.value === null || item.value === undefined || item.value === ''
                ? '—'
                : typeof item.value === 'object'
                  ? JSON.stringify(item.value)
                  : String(item.value)}
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border/70 bg-muted/30 text-muted-foreground whitespace-nowrap">
            {RESOLUTION_SOURCE_LABELS[item.source] || 'Giống nhau'}
          </span>
        </div>
      ));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title={`Chi tiết xung đột #${id || '—'}`}
        description="So sánh bản trainer và bản hệ thống để chọn cách xử lý phù hợp"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Xung đột đồng bộ', href: backToListPath },
          { label: `Chi tiết #${id || '—'}` },
        ]}
        actions={
          <Button variant="outline" onClick={() => navigate(backToListPath)}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        }
      />

      {loading ? (
        <div className="h-56 rounded-xl border border-border/60 bg-card animate-pulse" />
      ) : !detail ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          Không tìm thấy dữ liệu xung đột.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border/60 bg-card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Loại dữ liệu:</span> <span className="font-medium text-foreground">{getEntityTypeLabel(detail.entityType)}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Mã record:</span> <span className="font-medium text-foreground">{detail.entityId || '—'}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Trainer:</span> <span className="font-medium text-foreground">{detail.trainerName || '—'}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Phát hiện lúc:</span> <span className="font-medium text-foreground">{formatDateTime(detail.conflictDetectedAt)}</span></p>
            </div>
            <div className="space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Bản trainer cập nhật:</span> <span className="font-medium text-foreground">{formatDateTime(detail.localData?.updated_at || detail.localData?.updatedAt)}</span></p>
              <p className="text-sm"><span className="text-muted-foreground">Bản hệ thống cập nhật:</span> <span className="font-medium text-foreground">{formatDateTime(detail.serverData?.updated_at || detail.serverData?.updatedAt)}</span></p>
              <p className="text-sm inline-flex items-center gap-2">
                <span className="text-muted-foreground">Trạng thái:</span>
                <ConflictStatusTag status={detail.status} />
              </p>
              {!isPending ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Kết quả xử lý:</span>{' '}
                  <span className="font-medium text-foreground">{RESOLUTION_LABELS[String(detail.resolutionType || '').toUpperCase()] || '—'}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
            <ConflictDiffView
              localData={detail.localData || {}}
              serverData={detail.serverData || {}}
              mergedData={detail.mergedData || null}
              conflictedFields={detail.conflictedFields || []}
              entityType={detail.entityType}
              mode={mode}
              selections={selections}
              onSelectionChange={(field, value) => {
                setSelections((prev) => ({
                  ...prev,
                  [field]: value,
                }));
              }}
              localLabel={detail.trainerName || 'Trainer'}
              serverLabel={detail.serverModifiedBy || 'Hệ thống'}
            />

            {mode === 'merge' && isPending ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-sm font-semibold text-foreground mb-2">Xem trước bản merged</p>
                <div className="max-h-64 overflow-y-auto pr-1">{renderMergedPreviewRows()}</div>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Ghi chú lý do (không bắt buộc)</label>
              <FormTextarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Nhập ghi chú cho quyết định xử lý..."
                disabled={!isPending || resolving}
              />
            </div>

            {isPending ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setConfirmType('KEEP_SERVER')} disabled={resolving}>
                  <ShieldCheck className="h-4 w-4" />
                  Giữ bản hệ thống
                </Button>
                <Button variant="outline" onClick={() => setConfirmType('KEEP_LOCAL')} disabled={resolving}>
                  <UserCog className="h-4 w-4" />
                  Giữ bản trainer
                </Button>
                {mode === 'merge' ? (
                  <>
                    <Button variant="primary" onClick={() => resolveConflict('MERGED')} disabled={resolving || !allConflictedFieldsSelected}>
                      {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Xác nhận merge
                    </Button>
                    <Button variant="ghost" onClick={cancelMergeMode} disabled={resolving}>
                      Hủy merge
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={enterMergeMode} disabled={resolving}>
                    <GitMerge className="h-4 w-4" />
                    Merge - chọn từng field
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                <p className="text-foreground font-medium">Xung đột đã được xử lý</p>
                <p className="text-muted-foreground mt-1">
                  Bởi {detail.resolvedByName || '—'} lúc {formatDateTime(detail.resolvedAt)}
                </p>
                {detail.resolutionNote ? (
                  <p className="mt-2 text-foreground whitespace-pre-wrap">{detail.resolutionNote}</p>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmType === 'KEEP_SERVER'}
        onClose={() => setConfirmType(null)}
        title="Giữ bản hệ thống"
        description="Bạn chắc chắn muốn giữ bản hệ thống? Bản trainer sẽ bị bỏ qua."
        confirmLabel="Xác nhận"
        onConfirm={() => resolveConflict('KEEP_SERVER')}
        loading={resolving}
        variant="primary"
      />

      <ConfirmDialog
        open={confirmType === 'KEEP_LOCAL'}
        onClose={() => setConfirmType(null)}
        title="Giữ bản trainer"
        description="Bạn chắc chắn muốn dùng bản trainer? Dữ liệu trên hệ thống sẽ bị ghi đè."
        confirmLabel="Xác nhận"
        onConfirm={() => resolveConflict('KEEP_LOCAL')}
        loading={resolving}
        variant="primary"
      />
    </div>
  );
};

export default ConflictDetailPage;
