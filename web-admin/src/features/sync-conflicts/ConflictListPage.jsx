import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import { Button } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import syncConflictService from '../../services/syncConflictService';
import ConflictStatusTag from './components/ConflictStatusTag';

const STATUS_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'DISMISSED', label: 'Đã bỏ qua' },
];

const ENTITY_TYPE_META = {
  HEALTH_RECORD: {
    label: 'Hồ sơ sức khỏe',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
  FIELD_NOTE: {
    label: 'Ghi chú thực địa',
    className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
  },
  CONTENT_SUGGESTION: {
    label: 'Góp ý nội dung',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
};

const normalizeEntityType = (value) =>
  String(value || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getEntityMeta = (value) => {
  const normalized = normalizeEntityType(value);
  if (ENTITY_TYPE_META[normalized]) return ENTITY_TYPE_META[normalized];
  return {
    label: normalized || 'Không xác định',
    className: 'bg-muted text-muted-foreground border-border/70',
  };
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
};

const ConflictEntityTag = ({ entityType }) => {
  const meta = getEntityMeta(entityType);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const emitConflictCountRefresh = (count) => {
  window.dispatchEvent(
    new CustomEvent('sync-conflicts:count-updated', {
      detail: { pending: Number.isFinite(count) ? count : 0 },
    })
  );
};

const ConflictListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [activeStatus, setActiveStatus] = useState('PENDING');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 20,
    totalItems: 0,
  });

  const fetchPendingCount = useCallback(async () => {
    try {
      const count = await syncConflictService.getPendingCount();
      setPendingCount(count);
      emitConflictCountRefresh(count);
    } catch {
      // silent for badge polling
    }
  }, []);

  const fetchRows = useCallback(
    async (nextPage = pagination.page, nextPageSize = pagination.pageSize, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await syncConflictService.getConflicts(activeStatus, nextPage, nextPageSize);
        const payload = res?.data || {};
        const content = Array.isArray(payload?.content) ? payload.content : [];

        setRows(content);
        setPagination((prev) => ({
          ...prev,
          page: Number.isFinite(payload?.page) ? payload.page : nextPage,
          pageSize: Number.isFinite(payload?.size) ? payload.size : nextPageSize,
          totalItems: Number.isFinite(payload?.totalElements) ? payload.totalElements : content.length,
        }));
      } catch (error) {
        setRows([]);
        setPagination((prev) => ({
          ...prev,
          page: nextPage,
          pageSize: nextPageSize,
          totalItems: 0,
        }));
        toast.error(error, { title: 'Không tải được danh sách xung đột đồng bộ' });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeStatus, pagination.page, pagination.pageSize, toast]
  );

  useEffect(() => {
    fetchRows(0, pagination.pageSize);
  }, [activeStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchRows(pagination.page, pagination.pageSize, true);
      fetchPendingCount();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchPendingCount, fetchRows, pagination.page, pagination.pageSize]);

  const columns = useMemo(
    () => [
      {
        key: 'entityType',
        header: 'Loại dữ liệu',
        className: 'min-w-[170px]',
        render: (row) => <ConflictEntityTag entityType={row?.entityType} />,
      },
      {
        key: 'entityId',
        header: 'Mã record',
        className: 'w-[110px]',
        render: (row) => row?.entityId ?? '—',
      },
      {
        key: 'trainerName',
        header: 'Trainer',
        className: 'min-w-[180px]',
        render: (row) => row?.trainerName || '—',
      },
      {
        key: 'conflictedFieldCount',
        header: 'Fields xung đột',
        className: 'w-[130px]',
        render: (row) => `${Number(row?.conflictedFieldCount || 0)} fields`,
      },
      {
        key: 'conflictDetectedAt',
        header: 'Phát hiện lúc',
        className: 'min-w-[165px]',
        render: (row) => formatDateTime(row?.conflictDetectedAt),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        className: 'w-[130px]',
        render: (row) => <ConflictStatusTag status={row?.status} />,
      },
      {
        key: 'actions',
        header: 'Thao tác',
        className: 'w-[96px]',
        render: (row) => (
          <button
            type="button"
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Xem chi tiết"
            onClick={() =>
              navigate(`/sync-conflicts/${row?.id}`, {
                state: {
                  returnTo:
                    location.pathname.startsWith('/admin/sync-conflicts')
                      ? '/admin/sync-conflicts'
                      : '/sync-conflicts',
                },
              })
            }
          >
            <Eye className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [location.pathname, navigate]
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Xung đột đồng bộ"
        description="Theo dõi và xử lý các bản ghi bị xung đột khi trainer đồng bộ dữ liệu"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Xung đột đồng bộ' }]}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              fetchRows(pagination.page, pagination.pageSize);
              fetchPendingCount();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        }
      />

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const isActive = tab.value === activeStatus;
            const showPendingCount = tab.value === 'PENDING';
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveStatus(tab.value)}
                className={[
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40',
                ].join(' ')}
              >
                <span>{tab.label}</span>
                {showPendingCount ? (
                  <span className="inline-flex min-w-5 h-5 px-1 rounded-full items-center justify-center text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/25">
                    {pendingCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={(nextPage) => fetchRows(nextPage, pagination.pageSize)}
          onPageSizeChange={(nextPageSize) => fetchRows(0, nextPageSize)}
          emptyMessage="Không có xung đột dữ liệu nào"
          emptyIcon={<AlertTriangle className="h-12 w-12 opacity-40" />}
        />
      </div>
    </div>
  );
};

export default ConflictListPage;
