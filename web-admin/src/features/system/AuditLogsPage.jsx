import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Eye, Search, TimerReset } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import FilterSelect from '../../components/shared/FilterSelect';
import { Button, Modal } from '../../components/ui/FormComponents';
import { useToast } from '../../components/ui/Toast';
import { auditLogService } from '../../services/auditLogService';
import { getAuditDescriptionVi, getAuditEntityLabelVi } from '../../utils/auditLogLabels';
import { sortAuditLogsCreateFirst } from '../../utils/auditLogSort';

const actionTypeOptions = [
  { value: 'all', label: 'Tất cả thao tác' },
  { value: 'LOGIN', label: 'Đăng nhập' },
  { value: 'LOGIN_FAILED', label: 'Đăng nhập thất bại' },
  { value: 'LOGOUT', label: 'Đăng xuất' },
  { value: 'CHANGE_PASSWORD', label: 'Đổi mật khẩu' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa' },
  { value: 'APPROVE', label: 'Duyệt' },
  { value: 'REJECT', label: 'Từ chối' },
  { value: 'PUBLISH', label: 'Xuất bản' },
  { value: 'UNPUBLISH', label: 'Gỡ xuất bản' },
  { value: 'SUBMIT_FOR_REVIEW', label: 'Gửi duyệt' },
  { value: 'LOCK_USER', label: 'Khóa người dùng' },
  { value: 'UNLOCK_USER', label: 'Mở khóa người dùng' },
  { value: 'ACTIVATE_USER', label: 'Kích hoạt người dùng' },
  { value: 'DEACTIVATE_USER', label: 'Vô hiệu hóa người dùng' },
  { value: 'IMPORT_DATA', label: 'Import dữ liệu' },
  { value: 'EXPORT_DATA', label: 'Export dữ liệu' },
  { value: 'SYNC_PUSH', label: 'Đẩy đồng bộ' },
  { value: 'SYNC_PULL', label: 'Nhận đồng bộ' },
];

const entityTypeOptions = [
  { value: 'all', label: 'Tất cả đối tượng' },
  { value: 'CONTENT', label: 'Nội dung' },
  { value: 'DOG_BREED', label: 'Giống chó' },
  { value: 'DOG_PROFILE', label: 'Hồ sơ chó' },
  { value: 'NUTRITION_STANDARD', label: 'Tiêu chuẩn dinh dưỡng' },
  { value: 'TRAINING_EXERCISE', label: 'Bài tập huấn luyện' },
  { value: 'TRAINING_ROADMAP', label: 'Lộ trình huấn luyện' },
  { value: 'TRAINING_METHOD', label: 'Phương pháp huấn luyện' },
  { value: 'DEVELOPMENT_STAGE', label: 'Giai đoạn phát triển' },
  { value: 'DISEASE', label: 'Bệnh' },
  { value: 'MEDICATION', label: 'Thuốc' },
  { value: 'FIRST_AID_GUIDE', label: 'Sơ cứu' },
  { value: 'SYSTEM_SETTING', label: 'Cài đặt hệ thống' },
  { value: 'USER', label: 'Người dùng' },
];

const actionLabelMap = Object.fromEntries(
  actionTypeOptions
    .filter((option) => option.value !== 'all')
    .map((option) => [option.value, option.label])
);

const resolveActionLabel = (value) => actionLabelMap[value] || value || '—';
const actionBadgeClassMap = {
  LOGIN: 'border-blue-200 bg-blue-50 text-blue-700',
  LOGIN_FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
  LOGOUT: 'border-slate-200 bg-slate-100 text-slate-700',
  CHANGE_PASSWORD: 'border-violet-200 bg-violet-50 text-violet-700',
  CREATE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  UPDATE: 'border-amber-200 bg-amber-50 text-amber-700',
  DELETE: 'border-red-200 bg-red-50 text-red-700',
  APPROVE: 'border-green-200 bg-green-50 text-green-700',
  REJECT: 'border-pink-200 bg-pink-50 text-pink-700',
  PUBLISH: 'border-lime-200 bg-lime-50 text-lime-700',
  UNPUBLISH: 'border-orange-200 bg-orange-50 text-orange-700',
  SUBMIT_FOR_REVIEW: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  LOCK_USER: 'border-red-200 bg-red-50 text-red-700',
  UNLOCK_USER: 'border-teal-200 bg-teal-50 text-teal-700',
  ACTIVATE_USER: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DEACTIVATE_USER: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  IMPORT_DATA: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  EXPORT_DATA: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  SYNC_PUSH: 'border-sky-200 bg-sky-50 text-sky-700',
  SYNC_PULL: 'border-purple-200 bg-purple-50 text-purple-700',
};
const getActionBadgeClasses = (actionType) =>
  actionBadgeClassMap[actionType] || 'border-accent/20 bg-accent/10 text-accent';

const resolveEntityLabel = (value) => {
  return getAuditEntityLabelVi(value);
};

const getDateTimeParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: value, date: '' };
  const two = (num) => String(num).padStart(2, '0');
  return {
    time: `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`,
    date: `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()}`,
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

const parseJsonIfPossible = (rawValue) => {
  if (!rawValue || typeof rawValue !== 'string') return rawValue || '—';
  const normalized = rawValue.trim();
  if (!normalized.startsWith('{') && !normalized.startsWith('[')) return rawValue;
  try {
    const parsed = JSON.parse(normalized);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return rawValue;
  }
};

const ActionBadge = ({ actionType }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getActionBadgeClasses(actionType)}`}>
    {resolveActionLabel(actionType)}
  </span>
);

const AuditLogsPage = () => {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({ totalLogs: 0, todayLogs: 0, thisWeekLogs: 0 });
  const [search, setSearch] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await auditLogService.getStats();
      const payload = res?.data || {};
      setStats({
        totalLogs: payload.totalLogs || 0,
        todayLogs: payload.todayLogs || 0,
        thisWeekLogs: payload.thisWeekLogs || 0,
      });
    } catch (error) {
      console.error('Fetch audit stats error:', error);
      toast.error(error, { title: 'Không tải được thống kê nhật ký' });
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchLogs = async (page = 0, size = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await auditLogService.getAll({
        page,
        size,
        actionType: actionTypeFilter === 'all' ? '' : actionTypeFilter,
        entityType: entityTypeFilter === 'all' ? '' : entityTypeFilter,
        from: fromDate,
        to: toDate,
      });

      const payload = res?.data || {};
      const content = Array.isArray(payload.content) ? payload.content : [];

      setLogs(sortAuditLogsCreateFirst(content));
      setPagination((prev) => ({
        ...prev,
        page,
        total: payload.totalElements || 0,
      }));
    } catch (error) {
      console.error('Fetch audit logs error:', error);
      toast.error(error, { title: 'Không tải được danh sách nhật ký' });
      setLogs([]);
      setPagination((prev) => ({ ...prev, page, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLogs(0, pagination.pageSize);
  }, [actionTypeFilter, entityTypeFilter, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedSearch = search.trim().toLowerCase();

  const filteredLogs = useMemo(() => {
    if (!normalizedSearch) return logs;
    return logs.filter((row) => {
      const haystack = [
        row?.description,
        getAuditDescriptionVi(row?.description, { actionType: row?.actionType, entityType: row?.entityType }),
        row?.username,
        row?.fullName,
        row?.entityType,
        resolveEntityLabel(row?.entityType),
        row?.actionType,
        row?.ipAddress,
        row?.entityId,
      ]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).toLowerCase())
        .join(' ');
      return haystack.includes(normalizedSearch);
    });
  }, [logs, normalizedSearch]);

  const hasClientFilter = Boolean(normalizedSearch);

  const openDetail = async (row) => {
    if (!row?.logId) return;
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await auditLogService.getById(row.logId);
      setDetailData(res?.data || row);
    } catch (error) {
      console.error('Fetch audit detail error:', error);
      setDetailData(row);
      toast.error(error, { title: 'Không tải được chi tiết nhật ký, hiển thị dữ liệu tạm' });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailData(null);
  };

  const columns = [
    { key: 'user', header: 'Người dùng', className: 'w-44', render: (row) => row.fullName || row.username || 'Hệ thống' },
    { key: 'actionType', header: 'Hành động', className: 'w-44', render: (row) => <ActionBadge actionType={row.actionType} /> },
    { key: 'entityType', header: 'Đối tượng', className: 'w-44', render: (row) => resolveEntityLabel(row.entityType) },
    {
      key: 'description',
      header: 'Mô tả',
      render: (row) => getAuditDescriptionVi(row.description, { actionType: row.actionType, entityType: row.entityType }),
    },
    {
      key: 'actionTimestamp',
      header: 'Thời gian',
      className: 'w-44',
      render: (row) => renderDateTimeCell(row.actionTimestamp),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-32 whitespace-nowrap',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openDetail(row)} title="Xem chi tiết">
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Nhật ký kiểm tra"
        description="Theo dõi lịch sử thao tác và hoạt động hệ thống"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Quản trị hệ thống' },
          { label: 'Nhật ký kiểm tra' },
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              fetchStats();
              fetchLogs(0, pagination.pageSize);
            }}
          >
            <TimerReset className="h-4 w-4" />
            Làm mới
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <StatCard
          index={0}
          title="Tổng nhật ký"
          value={statsLoading ? '...' : stats.totalLogs}
          icon={ClipboardList}
          description="Toàn bộ bản ghi"
        />
        <StatCard
          index={1}
          title="Hôm nay"
          value={statsLoading ? '...' : stats.todayLogs}
          icon={CalendarDays}
          description="Phát sinh trong ngày"
        />
        <StatCard
          index={2}
          title="7 ngày qua"
          value={statsLoading ? '...' : stats.thisWeekLogs}
          icon={CalendarDays}
          description="Tổng thao tác tuần này"
        />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm mô tả, người dùng..."
            className="w-full pl-9 h-9 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect
            value={actionTypeFilter}
            onChange={(value) => {
              setActionTypeFilter(value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            options={actionTypeOptions}
            className="w-[170px]"
          />
          <FilterSelect
            value={entityTypeFilter}
            onChange={(value) => {
              setEntityTypeFilter(value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            options={entityTypeOptions}
            className="w-[170px]"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            className="h-9 w-[150px] px-3 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
          />
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value);
              setPagination((prev) => ({ ...prev, page: 0 }));
            }}
            className="h-9 w-[150px] px-3 border border-border/60 rounded-lg text-sm outline-none focus:border-accent/50 bg-background"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={loading}
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={hasClientFilter ? filteredLogs.length : pagination.total}
        onPageChange={(nextPage) => fetchLogs(nextPage, pagination.pageSize)}
        onPageSizeChange={(size) => {
          setPagination((prev) => ({ ...prev, pageSize: size }));
          fetchLogs(0, size);
        }}
        emptyMessage="Chưa có dữ liệu nhật ký"
      />

      <Modal
        open={detailOpen}
        onClose={closeDetail}
        title="Chi tiết nhật ký kiểm tra"
        width={820}
      >
        {detailLoading ? (
          <div className="h-40 animate-pulse rounded-lg border border-border/60 bg-muted/20" />
        ) : detailData ? (
          <div className="space-y-3">
            {[
              ['Người dùng', detailData.fullName || detailData.username || 'Hệ thống'],
              ['Hành động', resolveActionLabel(detailData.actionType)],
              ['Đối tượng', resolveEntityLabel(detailData.entityType)],
              ['Entity ID', detailData.entityId || '—'],
              ['Thời gian', (() => {
                const parts = getDateTimeParts(detailData.actionTimestamp);
                if (!parts) return '—';
                return `${parts.time} ${parts.date}`;
              })()],
              [
                'Mô tả',
                getAuditDescriptionVi(detailData.description, {
                  actionType: detailData.actionType,
                  entityType: detailData.entityType,
                }),
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-muted-foreground w-36 flex-shrink-0">{label}</span>
                <span className="text-sm text-foreground break-words">{value || '—'}</span>
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Giá trị cũ</p>
                <pre className="max-h-52 overflow-auto rounded-lg border border-border/60 bg-muted/10 p-3 text-xs text-foreground whitespace-pre-wrap break-words">
                  {parseJsonIfPossible(detailData.oldValues)}
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Giá trị mới</p>
                <pre className="max-h-52 overflow-auto rounded-lg border border-border/60 bg-muted/10 p-3 text-xs text-foreground whitespace-pre-wrap break-words">
                  {parseJsonIfPossible(detailData.newValues)}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AuditLogsPage;
