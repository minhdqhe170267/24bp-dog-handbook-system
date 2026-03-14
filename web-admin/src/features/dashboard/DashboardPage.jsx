import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import { FileText, Clock, Users, Lightbulb, PenSquare, CheckCircle, BarChart3, ArrowRight, XCircle, Settings, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import api from '../../services/api';

const statusColors = {
  PUBLISHED: 'hsl(142, 76%, 36%)',
  PENDING: 'hsl(38, 92%, 50%)',
  DRAFT: 'hsl(215, 16%, 47%)',
  APPROVED: 'hsl(217, 91%, 60%)',
  REJECTED: 'hsl(0, 84%, 60%)',
};

const statusLabels = {
  PUBLISHED: 'Đã xuất bản',
  PENDING: 'Chờ duyệt',
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const contentTypeLabels = {
  BREED_INFO: 'Giống chó',
  TRAINING_GUIDE: 'Huấn luyện',
  HEALTH_INFO: 'Sức khỏe',
  NUTRITION_GUIDE: 'Dinh dưỡng',
  FIRST_AID: 'Sơ cứu',
};

const roleDescriptions = {
  ADMIN: 'Tổng quan vận hành hệ thống và quản trị dữ liệu',
  CONTENT_EDITOR: 'Theo dõi nội dung do bạn biên tập và trạng thái xuất bản',
  REVIEWER: 'Theo dõi hàng chờ kiểm duyệt và ưu tiên xử lý',
};

const quickActionsByRole = {
  ADMIN: [
    { icon: Users, label: 'Quản lý người dùng', href: '/system/users', desc: 'Cập nhật tài khoản hệ thống' },
    { icon: Settings, label: 'Cài đặt hệ thống', href: '/system/settings', desc: 'Cấu hình thông số hệ thống' },
    { icon: ClipboardList, label: 'Nhật ký kiểm tra', href: '/system/audit-logs', desc: 'Theo dõi hoạt động kiểm tra' },
  ],
  CONTENT_EDITOR: [
    { icon: PenSquare, label: 'Tạo nội dung', href: '/content/create', desc: 'Soạn nội dung mới' },
    { icon: FileText, label: 'Danh sách nội dung', href: '/content', desc: 'Xem và chỉnh sửa bài viết' },
    { icon: Lightbulb, label: 'Đề xuất nội dung', href: '/suggestions', desc: 'Theo dõi đề xuất từ trainer' },
  ],
  REVIEWER: [
    { icon: CheckCircle, label: 'Duyệt nội dung', href: '/approval', desc: 'Xử lý hàng chờ duyệt' },
    { icon: FileText, label: 'Danh sách nội dung', href: '/content', desc: 'Xem chi tiết bài viết' },
    { icon: BarChart3, label: 'Xem tổng quan', href: '/dashboard', desc: 'Theo dõi ưu tiên xử lý' },
  ],
};

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();

const normalizeStatus = (value) => (value || '').toString().trim().toUpperCase();

const getTypeLabel = (value) => contentTypeLabels[value] || value || 'Khác';

const getStatusCount = (statusMap, key) => Number(statusMap[key] || 0);

const buildStatusChartData = (statusMap, keys) =>
  keys
    .map((key) => ({
      name: statusLabels[key] || key,
      value: getStatusCount(statusMap, key),
      color: statusColors[key] || 'hsl(215, 16%, 47%)',
    }))
    .filter((item) => item.value > 0);

const buildTypeChartData = (items) => {
  const typeMap = {};
  items.forEach((item) => {
    const type = item.contentType || item.content_type || 'OTHER';
    typeMap[type] = (typeMap[type] || 0) + 1;
  });

  return Object.entries(typeMap).map(([type, count]) => ({
    name: getTypeLabel(type),
    count,
  }));
};

const buildStatusMap = (items) => {
  const map = {};
  items.forEach((item) => {
    const status = normalizeStatus(item.status) || 'DRAFT';
    map[status] = (map[status] || 0) + 1;
  });
  return map;
};

const getContentTimestamp = (item) => item.updatedAt || item.updated_at || item.createdAt || item.created_at || null;

const toReviewerDisplayStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'PUBLISHED') return 'APPROVED';
  return normalized;
};

const matchEditorContent = (item, currentUser) => {
  const currentUserId = Number(currentUser?.userId);
  const authorId = Number(item?.authorId ?? item?.author?.userId ?? item?.author?.id);

  if (Number.isFinite(currentUserId) && currentUserId > 0 && Number.isFinite(authorId) && authorId > 0) {
    return currentUserId === authorId;
  }

  const authorName = normalizeText(item?.authorName || item?.author?.fullName || item?.author?.full_name || item?.author?.username);
  const fullName = normalizeText(currentUser?.fullName);
  const username = normalizeText(currentUser?.username);

  return Boolean(authorName && (authorName === fullName || authorName === username));
};

const sortByLatest = (items) =>
  [...items].sort((a, b) => {
    const timeA = new Date(getContentTimestamp(a) || 0).getTime();
    const timeB = new Date(getContentTimestamp(b) || 0).getTime();
    return timeB - timeA;
  });

const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalContent: 0, pendingReviews: 0, totalUsers: 0, newSuggestions: 0 });
  const [contentByType, setContentByType] = useState([]);
  const [contentByStatus, setContentByStatus] = useState([]);
  const [statusCountMap, setStatusCountMap] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingContent, setPendingContent] = useState([]);
  const [activityLimit, setActivityLimit] = useState(5);
  const [reviewerStatusSummary, setReviewerStatusSummary] = useState({
    totalContent: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchAllContents = async (pageSize = 100) => {
    const firstRes = await api.get(`/contents?page=0&size=${pageSize}`);
    const firstPage = firstRes.data || firstRes || {};
    const firstItems = Array.isArray(firstPage.content) ? firstPage.content : [];
    const totalPages = Number(firstPage.totalPages || 1);
    const allContents = [...firstItems];

    for (let currentPage = 1; currentPage < totalPages; currentPage += 1) {
      const pageRes = await api.get(`/contents?page=${currentPage}&size=${pageSize}`);
      const pageData = pageRes.data || pageRes || {};
      if (Array.isArray(pageData.content)) {
        allContents.push(...pageData.content);
      }
    }

    return {
      allContents,
      firstPage,
      totalElements: Number(firstPage.totalElements ?? allContents.length),
    };
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);

      try {
        let statsFromApi = null;

        if (role === 'ADMIN') {
          try {
            const statsRes = await api.get('/dashboard/stats');
            const dashboardData = statsRes.data || statsRes || {};
            statsFromApi = {
              totalContent: dashboardData.totalContent ?? dashboardData.totalContents ?? null,
              pendingReviews: dashboardData.pendingReviews ?? dashboardData.pendingReviewsCount ?? null,
              totalUsers: dashboardData.totalUsers ?? 0,
              newSuggestions: dashboardData.newSuggestions ?? dashboardData.newSuggestionsCount ?? null,
            };

            setStats((prev) => ({
              ...prev,
              totalContent: statsFromApi.totalContent ?? prev.totalContent,
              pendingReviews: statsFromApi.pendingReviews ?? prev.pendingReviews,
              totalUsers: statsFromApi.totalUsers,
              newSuggestions: statsFromApi.newSuggestions ?? prev.newSuggestions,
            }));
          } catch {
            // fallback bằng API list
          }
        }

        if (role === 'REVIEWER') {
          try {
            const { allContents, totalElements } = await fetchAllContents(100);
            const reviewStatusContents = sortByLatest(allContents).filter((item) =>
              ['PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED'].includes(normalizeStatus(item.status))
            );

            const baseStatusMap = buildStatusMap(reviewStatusContents);
            const pendingCount = getStatusCount(baseStatusMap, 'PENDING');
            const approvedCount = getStatusCount(baseStatusMap, 'APPROVED') + getStatusCount(baseStatusMap, 'PUBLISHED');
            const rejectedCount = getStatusCount(baseStatusMap, 'REJECTED');

            const reviewerStatusData = [
              { name: 'Chờ duyệt', value: pendingCount, color: statusColors.PENDING },
              { name: 'Đã duyệt', value: approvedCount, color: statusColors.APPROVED },
              { name: 'Đã từ chối', value: rejectedCount, color: statusColors.REJECTED },
            ].filter((item) => item.value > 0);

            setReviewerStatusSummary({
              totalContent: totalElements,
              pending: pendingCount,
              approved: approvedCount,
              rejected: rejectedCount,
            });

            setStatusCountMap({
              PENDING: pendingCount,
              APPROVED: approvedCount,
              REJECTED: rejectedCount,
            });
            setContentByType(reviewerStatusData.map((item) => ({ name: item.name, count: item.value })));
            setContentByStatus(reviewerStatusData);
            setPendingContent(reviewStatusContents.slice(0, 10));
            setStats({ totalContent: totalElements, pendingReviews: pendingCount, totalUsers: 0, newSuggestions: 0 });
          } catch {
            setContentByType([]);
            setStatusCountMap({});
            setContentByStatus([]);
            setPendingContent([]);
            setReviewerStatusSummary({
              totalContent: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
            });
          }
        } else {
          setReviewerStatusSummary({
            totalContent: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
          });
          try {
            const { allContents, totalElements } = await fetchAllContents(100);
            const scopedContents =
              role === 'CONTENT_EDITOR'
                ? allContents.filter((item) => matchEditorContent(item, user))
                : allContents;

            const scopedSorted = sortByLatest(scopedContents);
            const nextStatusMap = buildStatusMap(scopedSorted);

            setStatusCountMap(nextStatusMap);
            setContentByType(buildTypeChartData(scopedSorted));
            setContentByStatus(
              Object.entries(nextStatusMap).map(([name, value]) => ({
                name: statusLabels[name] || name,
                value,
                color: statusColors[name] || 'hsl(215, 16%, 47%)',
              }))
            );

            if (role === 'CONTENT_EDITOR') {
              const ownPending = scopedSorted.filter((item) => normalizeStatus(item.status) === 'PENDING');
              setPendingContent(ownPending.slice(0, 10));
              setStats({
                totalContent: scopedSorted.length,
                pendingReviews: ownPending.length,
                totalUsers: 0,
                newSuggestions: 0,
              });
            } else {
              setStats((prev) => ({
                ...prev,
                totalContent: statsFromApi?.totalContent ?? totalElements ?? prev.totalContent,
                pendingReviews: statsFromApi?.pendingReviews ?? prev.pendingReviews,
              }));
            }
          } catch {
            setStatusCountMap({});
            setContentByType([]);
            setContentByStatus([]);
            if (role === 'CONTENT_EDITOR') {
              setPendingContent([]);
              setStats({ totalContent: 0, pendingReviews: 0, totalUsers: 0, newSuggestions: 0 });
            }
          }

          if (role === 'ADMIN') {
            try {
              const pendingRes = await api.get('/contents/pending-reviews?page=0&size=10');
              const pendingPage = pendingRes.data || pendingRes || {};
              const pendingData = Array.isArray(pendingPage.content) ? pendingPage.content : [];
              const pendingTotal = Number(pendingPage.totalElements ?? pendingData.length);
              setPendingContent(pendingData);

              setStats((prev) => ({
                ...prev,
                pendingReviews: statsFromApi?.pendingReviews ?? pendingTotal,
              }));
            } catch {
              setPendingContent([]);
            }

            if (statsFromApi?.newSuggestions == null) {
              try {
                const suggestionRes = await api.get('/suggestions?page=0&size=1&status=SUBMITTED');
                const suggestionPage = suggestionRes.data || suggestionRes || {};
                const suggestionCount = Number(suggestionPage.totalElements ?? 0);
                setStats((prev) => ({ ...prev, newSuggestions: suggestionCount }));
              } catch {
                // giữ nguyên
              }
            }
          }
        }

        if (role === 'ADMIN') {
          try {
            const activityRes = await api.get('/audit-logs?page=0&size=20');
            const activityData = activityRes.data?.content || activityRes.content || [];
            setRecentActivity(activityData);
          } catch {
            setRecentActivity([]);
          }
        } else {
          setRecentActivity([]);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [role, user]);

  const statusChartData = useMemo(() => {
    if (role === 'REVIEWER') {
      return contentByStatus;
    }

    if (role === 'CONTENT_EDITOR') {
      return buildStatusChartData(statusCountMap, ['DRAFT', 'PENDING', 'PUBLISHED', 'APPROVED', 'REJECTED']);
    }

    return contentByStatus;
  }, [contentByStatus, role, statusCountMap]);

  const statCards = useMemo(() => {
    if (role === 'REVIEWER') {
      return [
        { title: 'Tổng nội dung', value: reviewerStatusSummary.totalContent, icon: FileText },
        { title: 'Chờ duyệt', value: reviewerStatusSummary.pending, icon: Clock },
        { title: 'Đã duyệt', value: reviewerStatusSummary.approved, icon: CheckCircle },
        { title: 'Đã từ chối', value: reviewerStatusSummary.rejected, icon: XCircle },
      ];
    }

    if (role === 'CONTENT_EDITOR') {
      return [
        { title: 'Nội dung của bạn', value: stats.totalContent, icon: FileText },
        { title: 'Nháp', value: getStatusCount(statusCountMap, 'DRAFT'), icon: PenSquare },
        { title: 'Chờ duyệt', value: stats.pendingReviews, icon: Clock },
        { title: 'Đã xuất bản', value: getStatusCount(statusCountMap, 'PUBLISHED'), icon: CheckCircle },
      ];
    }

    return [
      { title: 'Tổng nội dung', value: stats.totalContent, icon: FileText, trend: stats.totalContent > 0 ? { value: 12, label: 'tháng này' } : undefined },
      { title: 'Chờ duyệt', value: stats.pendingReviews, icon: Clock },
      { title: 'Người dùng', value: stats.totalUsers, icon: Users },
      { title: 'Đề xuất mới', value: stats.newSuggestions, icon: Lightbulb },
    ];
  }, [role, reviewerStatusSummary, stats, statusCountMap]);

  const quickActions = quickActionsByRole[role] || quickActionsByRole.ADMIN;
  const showActivityTable = role === 'ADMIN';

  const typeChartTitle = role === 'REVIEWER' ? 'Nội dung theo trạng thái duyệt' : 'Nội dung theo loại';
  const statusChartTitle = role === 'REVIEWER' ? 'Tỷ lệ trạng thái duyệt' : 'Trạng thái nội dung';

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

  const activityColumns = [
    { key: 'user', header: 'Người dùng', render: (row) => row.user?.full_name || row.user || row.username || '-' },
    { key: 'action_type', header: 'Hành động', render: (row) => row.action_type || row.actionType || '-' },
    { key: 'entity_type', header: 'Đối tượng', render: (row) => row.entity_type || row.entityType || '-' },
    { key: 'action_timestamp', header: 'Thời gian', render: (row) => renderDateTimeCell(row.action_timestamp || row.actionTimestamp || row.createdAt) },
  ];

  const pendingColumns = [
    { key: 'title', header: 'Tiêu đề', render: (row) => <span className="font-medium">{row.title || row.contentTitle || '-'}</span> },
    { key: 'content_type', header: 'Loại', render: (row) => getTypeLabel(row.contentType || row.content_type) },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        role === 'REVIEWER'
          ? <StatusBadge status={toReviewerDisplayStatus(row.status)} />
          : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/25">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              Chờ duyệt
            </span>
          )
      ),
    },
    { key: 'updatedAt', header: 'Cập nhật', render: (row) => renderDateTimeCell(getContentTimestamp(row)) },
  ];

  const pendingTableTitle =
    role === 'REVIEWER'
      ? 'Danh sách nội dung theo trạng thái duyệt'
      : role === 'CONTENT_EDITOR'
        ? 'Nội dung của bạn đang chờ duyệt'
        : 'Nội dung chờ duyệt';

  const pendingEmptyMessage =
    role === 'REVIEWER'
      ? 'Không có nội dung ở trạng thái duyệt'
      : role === 'CONTENT_EDITOR'
        ? 'Bạn không có nội dung nào đang chờ duyệt'
        : 'Không có nội dung chờ duyệt';

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user?.fullName || user?.username || 'Admin'}!`}
        description={roleDescriptions[role] || 'Tổng quan hệ thống quản lý sổ tay chó nghiệp vụ'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 bg-card rounded-xl border border-border/60 animate-pulse" />
          ))
        ) : (
          statCards.map((card, index) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              icon={card.icon}
              trend={card.trend}
              description={card.description}
              index={index}
            />
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="bg-card rounded-xl border border-border/60 h-full">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">Thao tác nhanh</h3>
            </div>
            <div className="px-6 pb-5 space-y-2">
              {quickActions.map((action, index) => (
                <Link
                  key={`${action.href}-${index}`}
                  to={action.href}
                  className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-all duration-200 border border-transparent hover:border-border/60 no-underline"
                >
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                    <action.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                </Link>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="bg-card rounded-xl border border-border/60 h-full">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">{typeChartTitle}</h3>
            </div>
            <div className="px-6 pb-5">
              {loading ? (
                <div className="h-[180px] bg-muted/30 rounded animate-pulse" />
              ) : contentByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={contentByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                  Chưa có dữ liệu nội dung
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="bg-card rounded-xl border border-border/60 h-full">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">{statusChartTitle}</h3>
            </div>
            <div className="px-6 pb-5">
              {loading ? (
                <div className="h-[180px] bg-muted/30 rounded animate-pulse" />
              ) : statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      dataKey="value"
                      paddingAngle={3}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                  Chưa có dữ liệu nội dung
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <div className={`grid grid-cols-1 ${showActivityTable ? 'lg:grid-cols-2' : ''} gap-4`}>
        {showActivityTable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <div className="bg-card rounded-xl border border-border/60">
              <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Hoạt động gần đây</h3>
                <select
                  value={activityLimit}
                  onChange={(event) => setActivityLimit(Number(event.target.value))}
                  className="h-8 px-2 border border-border rounded-md text-xs bg-card outline-none cursor-pointer text-foreground"
                >
                  {[5, 10, 15, 20].map((count) => (
                    <option key={count} value={count}>
                      {count} dòng
                    </option>
                  ))}
                </select>
              </div>
              <div className="px-6 pb-5">
                <DataTable
                  columns={activityColumns}
                  data={recentActivity.slice(0, activityLimit)}
                  totalItems={recentActivity.length}
                  emptyMessage="Chưa có dữ liệu hoạt động"
                />
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: showActivityTable ? 0.7 : 0.6, duration: 0.4 }}
        >
          <div className="bg-card rounded-xl border border-border/60">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">{pendingTableTitle}</h3>
            </div>
            <div className="px-6 pb-5">
              <DataTable
                columns={pendingColumns}
                data={pendingContent}
                totalItems={pendingContent.length}
                emptyMessage={pendingEmptyMessage}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
