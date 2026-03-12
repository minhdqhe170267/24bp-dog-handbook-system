import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import { FileText, Clock, Users, Lightbulb, PenSquare, CheckCircle, BarChart3, ArrowRight } from 'lucide-react';
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

const quickActions = [
  { icon: PenSquare, label: 'Tạo nội dung', href: '/content/create', desc: 'Thêm bài viết mới' },
  { icon: CheckCircle, label: 'Duyệt nội dung', href: '/approval', desc: 'Xem bài chờ duyệt' },
  { icon: BarChart3, label: 'Quản lý giống chó', href: '/breeds', desc: 'Cập nhật dữ liệu' },
];

const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalContent: 0, pendingReviews: 0, totalUsers: 0, newSuggestions: 0 });
  const [contentByType, setContentByType] = useState([]);
  const [contentByStatus, setContentByStatus] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingContent, setPendingContent] = useState([]);
  const [activityLimit, setActivityLimit] = useState(5);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // 1. Fetch stats từ API thật
        try {
          const statsRes = await api.get('/dashboard/stats');
          const d = statsRes.data || statsRes;
          setStats({
            totalContent: d.totalContent ?? d.totalBreeds ?? 0,
            pendingReviews: d.pendingReviews ?? 0,
            totalUsers: d.totalUsers ?? 0,
            newSuggestions: d.newSuggestions ?? 0,
          });
        } catch {
          // API chưa sẵn sàng → giữ giá trị 0
        }

        // 2. Fetch content list từ API thật → dùng để tạo chart data
        try {
          const contentRes = await api.get('/contents?page=0&size=100');
          const contents = contentRes.data?.content || contentRes.content || [];

          // Group by type cho Bar Chart
          const typeMap = {};
          contents.forEach(c => {
            const type = c.contentType || c.content_type || 'OTHER';
            typeMap[type] = (typeMap[type] || 0) + 1;
          });
          setContentByType(Object.entries(typeMap).map(([name, count]) => ({ name, count })));

          // Group by status cho Pie Chart
          const statusMap = {};
          contents.forEach(c => {
            const status = c.status || 'DRAFT';
            statusMap[status] = (statusMap[status] || 0) + 1;
          });
          setContentByStatus(Object.entries(statusMap).map(([name, value]) => ({
            name: statusLabels[name] || name,
            value,
            color: statusColors[name] || 'hsl(215, 16%, 47%)',
          })));
        } catch {
          // API chưa sẵn sàng → charts trống
        }

        // 3. Fetch pending content từ API thật
        try {
          const pendingRes = await api.get('/contents/pending-reviews?page=0&size=10');
          const pendingData = pendingRes.data?.content || pendingRes.content || [];
          setPendingContent(pendingData);
        } catch {
          // API chưa sẵn sàng → table trống
        }

        // 4. Fetch recent activity từ API thật (nếu có)
        // Backend chưa có API audit log → để trống, khi backend team làm xong sẽ tự hiện data
        try {
          const activityRes = await api.get('/audit-logs?page=0&size=20');
          const activityData = activityRes.data?.content || activityRes.content || [];
          setRecentActivity(activityData);
        } catch {
          // API chưa sẵn sàng → table trống
        }

      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const activityColumns = [
    { key: 'user', header: 'Người dùng', render: (r) => r.user?.full_name || r.user || r.username || '-' },
    { key: 'action_type', header: 'Hành động', render: (r) => r.action_type || r.actionType || '-' },
    { key: 'entity_type', header: 'Đối tượng', render: (r) => r.entity_type || r.entityType || '-' },
    { key: 'action_timestamp', header: 'Thời gian', render: (r) => formatDate(r.action_timestamp || r.actionTimestamp || r.createdAt) },
  ];

  const pendingColumns = [
    { key: 'title', header: 'Tiêu đề', render: (r) => <span className="font-medium">{r.title || r.contentTitle || '-'}</span> },
    { key: 'content_type', header: 'Loại', render: (r) => r.contentType || r.content_type || '-' },
    {
      key: 'status', header: 'Trạng thái', render: () => (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/25">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          Chờ duyệt
        </span>
      )
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user?.fullName || user?.username || 'Admin'}!`}
        description="Tổng quan hệ thống quản lý sổ tay chó nghiệp vụ"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-xl border border-border/60 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard title="Tổng nội dung" value={stats.totalContent} icon={FileText} trend={stats.totalContent > 0 ? { value: 12, label: 'tháng này' } : undefined} index={0} />
            <StatCard title="Chờ duyệt" value={stats.pendingReviews} icon={Clock} index={1} />
            <StatCard title="Người dùng" value={stats.totalUsers} icon={Users} index={2} />
            <StatCard title="Đề xuất mới" value={stats.newSuggestions} icon={Lightbulb} index={3} />
          </>
        )}
      </div>

      {/* Quick Actions + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <div className="bg-card rounded-xl border border-border/60 h-full">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">Thao tác nhanh</h3>
            </div>
            <div className="px-6 pb-5 space-y-2">
              {quickActions.map((action, i) => (
                <Link
                  key={i}
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
          <div className="bg-card rounded-xl border border-border/60 h-full">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">Nội dung theo loại</h3>
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
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
          <div className="bg-card rounded-xl border border-border/60 h-full">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">Trạng thái nội dung</h3>
            </div>
            <div className="px-6 pb-5">
              {loading ? (
                <div className="h-[180px] bg-muted/30 rounded animate-pulse" />
              ) : contentByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={contentByStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      dataKey="value"
                      paddingAngle={3}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {contentByStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
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

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.4 }}>
          <div className="bg-card rounded-xl border border-border/60">
            <div className="px-6 pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Hoạt động gần đây</h3>
              <select
                value={activityLimit}
                onChange={(e) => setActivityLimit(Number(e.target.value))}
                className="h-8 px-2 border border-border rounded-md text-xs bg-card outline-none cursor-pointer text-foreground"
              >
                {[5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n} dòng</option>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.4 }}>
          <div className="bg-card rounded-xl border border-border/60">
            <div className="px-6 pt-5 pb-3">
              <h3 className="text-base font-semibold text-foreground">Nội dung chờ duyệt</h3>
            </div>
            <div className="px-6 pb-5">
              <DataTable
                columns={pendingColumns}
                data={pendingContent}
                totalItems={pendingContent.length}
                emptyMessage="Không có nội dung chờ duyệt"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
