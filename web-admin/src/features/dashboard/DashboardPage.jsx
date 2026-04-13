import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import FilterSelect from '../../components/shared/FilterSelect';
import { FileText, Clock, Users, Lightbulb, PenSquare, CheckCircle, BarChart3, ArrowRight, XCircle, Settings, ClipboardList, Lock, ShieldAlert, AlertTriangle, CheckCheck, Wrench, Dog, BookOpen, Apple } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { approvalService, APPROVAL_ENTITY_TYPES } from '../../services/approvalService';
import { auditLogService } from '../../services/auditLogService';
import { systemSettingService } from '../../services/systemSettingService';
import { getAuditDescriptionVi, getAuditEntityLabelVi } from '../../utils/auditLogLabels';
import { sortAuditLogsCreateFirst } from '../../utils/auditLogSort';

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

const approvalEntityTypeLabels = {
  CONTENT: 'Bài viết',
  DOG_BREED: 'Giống chó',
  NUTRITION_STANDARD: 'Dinh dưỡng',
  TRAINING_EXERCISE: 'Bài tập',
  TRAINING_ROADMAP: 'Lộ trình',
  TRAINING_METHOD: 'Phương pháp',
  DEVELOPMENT_STAGE: 'Giai đoạn phát triển',
  DISEASE: 'Bệnh',
  MEDICATION: 'Thuốc',
  FIRST_AID_GUIDE: 'Sơ cứu',
};

const roleDescriptions = {
  ADMIN: 'Tổng quan vận hành hệ thống và quản trị dữ liệu',
  CONTENT_EDITOR: 'Theo dõi toàn bộ nội dung nghiệp vụ: giống chó, dinh dưỡng, huấn luyện, sức khỏe và bài viết',
  REVIEWER: 'Theo dõi hàng chờ kiểm duyệt và ưu tiên xử lý',
};

const quickActionsByRole = {
  ADMIN: [
    { icon: Users, label: 'Quản lý người dùng', href: '/system/users', desc: 'Cập nhật tài khoản hệ thống' },
    { icon: Settings, label: 'Cài đặt hệ thống', href: '/system/settings', desc: 'Cấu hình thông số hệ thống' },
    { icon: ClipboardList, label: 'Nhật ký kiểm tra', href: '/system/audit-logs', desc: 'Theo dõi hoạt động kiểm tra' },
  ],
  CONTENT_EDITOR: [
    { icon: Dog, label: 'Giống chó', href: '/breeds', desc: 'Biên tập dữ liệu giống chó' },
    { icon: BookOpen, label: 'Bài tập', href: '/training/exercises', desc: 'Quản lý bài tập huấn luyện' },
    { icon: Apple, label: 'Dinh dưỡng', href: '/nutrition', desc: 'Quản lý tiêu chuẩn dinh dưỡng' },
  ],
  REVIEWER: [
    { icon: CheckCircle, label: 'Duyệt nội dung', href: '/approval', desc: 'Xử lý hàng chờ duyệt' },
    { icon: FileText, label: 'Danh sách nội dung', href: '/content', desc: 'Xem chi tiết bài viết' },
    { icon: BarChart3, label: 'Xem tổng quan', href: '/dashboard', desc: 'Theo dõi ưu tiên xử lý' },
  ],
};

const activityLimitOptions = [
  { value: 5, label: '5 dòng' },
  { value: 10, label: '10 dòng' },
  { value: 15, label: '15 dòng' },
  { value: 20, label: '20 dòng' },
];

const ADMIN_AUDIT_LIMIT = 5;

const adminAuditActionOptions = [
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
  { value: 'IMPORT_DATA', label: 'Import dữ liệu' },
  { value: 'EXPORT_DATA', label: 'Export dữ liệu' },
];

const adminAuditEntityOptions = [
  { value: 'all', label: 'Tất cả đối tượng' },
  { value: 'CONTENT', label: 'Nội dung' },
  { value: 'DOG_BREED', label: 'Giống chó' },
  { value: 'DOG_PROFILE', label: 'Hồ sơ chó' },
  { value: 'NUTRITION_STANDARD', label: 'Dinh dưỡng' },
  { value: 'TRAINING_EXERCISE', label: 'Bài tập' },
  { value: 'TRAINING_ROADMAP', label: 'Lộ trình' },
  { value: 'TRAINING_METHOD', label: 'Phương pháp' },
  { value: 'DISEASE', label: 'Bệnh' },
  { value: 'MEDICATION', label: 'Thuốc' },
  { value: 'FIRST_AID_GUIDE', label: 'Sơ cứu' },
  { value: 'SYSTEM_SETTING', label: 'Cài đặt hệ thống' },
  { value: 'USER', label: 'Người dùng' },
];

const adminAuditActionLabelMap = Object.fromEntries(
  adminAuditActionOptions.filter((item) => item.value !== 'all').map((item) => [item.value, item.label])
);

const adminAuditEntityLabelMap = Object.fromEntries(
  adminAuditEntityOptions.filter((item) => item.value !== 'all').map((item) => [item.value, item.label])
);

const adminCriticalSettingConfigs = [
  { key: 'security.max_login_attempts', label: 'Giới hạn đăng nhập sai' },
  { key: 'security.session_timeout_minutes', label: 'Thời gian hết phiên' },
  { key: 'content.require_approval', label: 'Bắt buộc duyệt trước xuất bản' },
  { key: 'upload.max_image_size_mb', label: 'Giới hạn dung lượng ảnh' },
  { key: 'upload.max_video_size_mb', label: 'Giới hạn dung lượng video' },
  { key: 'system.maintenance_mode', label: 'Chế độ bảo trì hệ thống' },
];

const securityAlertActionSet = new Set(['LOGIN_FAILED', 'LOCK_USER']);

const resolveAuditActionLabel = (value) => adminAuditActionLabelMap[value] || value || '—';
const resolveAuditEntityLabel = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return adminAuditEntityLabelMap[normalized] || getAuditEntityLabelVi(value);
};

const isAccessDeniedMessage = (text) => {
  const normalized = normalizeText(text);
  return (
    normalized.includes('access denied') ||
    normalized.includes('forbidden') ||
    normalized.includes('không có quyền') ||
    normalized.includes('khong co quyen')
  );
};

const getSecurityAlertMeta = (logItem) => {
  const actionType = String(logItem?.actionType || logItem?.action_type || '').toUpperCase();
  const denied = isAccessDeniedMessage(logItem?.description);

  if (actionType === 'LOGIN_FAILED') {
    return { label: 'Đăng nhập thất bại', tone: 'danger', actionType };
  }
  if (actionType === 'LOCK_USER') {
    return { label: 'Khóa tài khoản', tone: 'warning', actionType };
  }
  if (denied) {
    return { label: 'Truy cập bị từ chối', tone: 'info', actionType: actionType || 'ACCESS_DENIED' };
  }
  return { label: 'Sự kiện bảo mật', tone: 'info', actionType };
};

const getAuditActionBadgeClass = (actionType) => {
  const map = {
    LOGIN_FAILED: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    LOCK_USER: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
    UNLOCK_USER: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    DELETE: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
    UPDATE: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    CREATE: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    APPROVE: 'border-lime-500/25 bg-lime-500/10 text-lime-700 dark:text-lime-300',
    REJECT: 'border-pink-500/25 bg-pink-500/10 text-pink-700 dark:text-pink-300',
    PUBLISH: 'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    UNPUBLISH: 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  };
  return map[actionType] || 'border-accent/20 bg-accent/10 text-accent';
};

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const evaluateSettingHealth = (settingKey, settingValue) => {
  const lowerValue = (settingValue || '').toString().trim().toLowerCase();
  const toResult = (tone, label, detail) => ({ tone, label, detail });

  switch (settingKey) {
    case 'security.max_login_attempts': {
      const value = parseNumber(settingValue);
      if (value == null) return toResult('warn', 'Thiếu dữ liệu', 'Không đọc được giá trị số');
      if (value < 3 || value > 10) return toResult('warn', 'Cần kiểm tra', `Giá trị hiện tại: ${value}`);
      return toResult('ok', 'Ổn định', `Giá trị hiện tại: ${value}`);
    }
    case 'security.session_timeout_minutes': {
      const value = parseNumber(settingValue);
      if (value == null) return toResult('warn', 'Thiếu dữ liệu', 'Không đọc được giá trị số');
      if (value < 10 || value > 120) return toResult('warn', 'Cần kiểm tra', `Giá trị hiện tại: ${value} phút`);
      return toResult('ok', 'Ổn định', `Giá trị hiện tại: ${value} phút`);
    }
    case 'content.require_approval':
      return lowerValue === 'true'
        ? toResult('ok', 'Ổn định', 'Luồng duyệt đang bật')
        : toResult('warn', 'Rủi ro', 'Luồng duyệt đang tắt');
    case 'upload.max_image_size_mb': {
      const value = parseNumber(settingValue);
      if (value == null) return toResult('warn', 'Thiếu dữ liệu', 'Không đọc được giá trị số');
      if (value > 20) return toResult('warn', 'Cần kiểm tra', `Giới hạn ảnh cao: ${value} MB`);
      return toResult('ok', 'Ổn định', `Giới hạn ảnh: ${value} MB`);
    }
    case 'upload.max_video_size_mb': {
      const value = parseNumber(settingValue);
      if (value == null) return toResult('warn', 'Thiếu dữ liệu', 'Không đọc được giá trị số');
      if (value > 200) return toResult('warn', 'Cần kiểm tra', `Giới hạn video cao: ${value} MB`);
      return toResult('ok', 'Ổn định', `Giới hạn video: ${value} MB`);
    }
    case 'system.maintenance_mode':
      return lowerValue === 'true'
        ? toResult('info', 'Bảo trì', 'Hệ thống đang bật chế độ bảo trì')
        : toResult('ok', 'Ổn định', 'Hệ thống đang hoạt động bình thường');
    default:
      return toResult('info', 'Theo dõi', `Giá trị hiện tại: ${settingValue || '—'}`);
  }
};

const normalizeText = (value) => (value || '').toString().trim().toLowerCase();

const normalizeStatus = (value) => (value || '').toString().trim().toUpperCase();

const getTypeLabel = (value) => contentTypeLabels[value] || value || 'Khác';
const getEntityTypeLabel = (value) => approvalEntityTypeLabels[value] || value || 'Khác';

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

const buildEntityTypeChartData = (items) => {
  const typeMap = {};
  items.forEach((item) => {
    const type = (item.entityType || 'CONTENT').toString().trim().toUpperCase();
    typeMap[type] = (typeMap[type] || 0) + 1;
  });

  return Object.entries(typeMap).map(([type, count]) => ({
    name: getEntityTypeLabel(type),
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
const getSortableEntityId = (item) => {
  const parsed = Number(item?.entityId ?? item?.contentId ?? item?.id ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const getPendingTitle = (item) => item?.entityTitle || item?.title || item?.contentTitle || '-';
const getPendingTypeLabel = (item) => {
  if (item?.entityType) return approvalEntityTypeLabels[item.entityType] || item.entityType;
  return getTypeLabel(item?.contentType || item?.content_type);
};

const toReviewerDisplayStatus = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'PUBLISHED') return 'APPROVED';
  return normalized;
};

const sortByLatest = (items) =>
  [...items].sort((a, b) => {
    const timeA = new Date(getContentTimestamp(a) || 0).getTime();
    const timeB = new Date(getContentTimestamp(b) || 0).getTime();
    if (timeA !== timeB) return timeB - timeA;
    return getSortableEntityId(b) - getSortableEntityId(a);
  });

const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalContent: 0, pendingReviews: 0, totalUsers: 0, newSuggestions: 0 });
  const [adminSystemStats, setAdminSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    lockedUsers: 0,
    totalLogs: 0,
  });
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
  const [adminAuditRows, setAdminAuditRows] = useState([]);
  const [adminAuditLoading, setAdminAuditLoading] = useState(false);
  const [adminSecurityAlerts, setAdminSecurityAlerts] = useState([]);
  const [adminCriticalSettings, setAdminCriticalSettings] = useState([]);
  const [adminSettingLoading, setAdminSettingLoading] = useState(false);

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

  const fetchAllUnifiedContents = async (pageSize = 100) => {
    const firstRes = await api.get(`/contents/unified?page=0&size=${pageSize}`);
    const firstPage = firstRes.data || firstRes || {};
    const firstItems = Array.isArray(firstPage.content) ? firstPage.content : [];
    const totalPages = Number(firstPage.totalPages || 1);
    const allContents = [...firstItems];

    for (let currentPage = 1; currentPage < totalPages; currentPage += 1) {
      const pageRes = await api.get(`/contents/unified?page=${currentPage}&size=${pageSize}`);
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

  const fetchAllUsers = async (pageSize = 200) => {
    const firstRes = await api.get(`/users?page=0&size=${pageSize}`);
    const firstPage = firstRes.data || firstRes || {};
    const firstItems = Array.isArray(firstPage.content) ? firstPage.content : [];
    const totalPages = Number(firstPage.totalPages || 1);
    const allUsers = [...firstItems];

    for (let currentPage = 1; currentPage < totalPages; currentPage += 1) {
      const pageRes = await api.get(`/users?page=${currentPage}&size=${pageSize}`);
      const pageData = pageRes.data || pageRes || {};
      if (Array.isArray(pageData.content)) {
        allUsers.push(...pageData.content);
      }
    }

    return allUsers;
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
            const totalUsers = Number(dashboardData.totalUsers ?? dashboardData.userCount ?? 0);
            statsFromApi = {
              totalContent: dashboardData.totalContent ?? dashboardData.totalContents ?? dashboardData.totalBreeds ?? null,
              pendingReviews: dashboardData.pendingReviews ?? dashboardData.pendingReviewsCount ?? null,
              totalUsers,
              newSuggestions: dashboardData.newSuggestions ?? dashboardData.newSuggestionsCount ?? null,
            };

            setStats((prev) => ({
              ...prev,
              totalContent: statsFromApi.totalContent ?? prev.totalContent,
              pendingReviews: statsFromApi.pendingReviews ?? prev.pendingReviews,
              totalUsers: statsFromApi.totalUsers,
              newSuggestions: statsFromApi.newSuggestions ?? prev.newSuggestions,
            }));

            setAdminSystemStats((prev) => ({
              ...prev,
              totalUsers,
              activeUsers: totalUsers,
              lockedUsers: 0,
            }));
          } catch {
            // fallback bằng API list
          }

          try {
            const [usersRes, auditStatsRes] = await Promise.allSettled([
              fetchAllUsers(200),
              api.get('/audit-logs/stats'),
            ]);

            let totalUsers = statsFromApi?.totalUsers ?? adminSystemStats.totalUsers;
            let activeUsers = adminSystemStats.activeUsers;
            let lockedUsers = adminSystemStats.lockedUsers;
            let totalLogs = adminSystemStats.totalLogs;

            if (usersRes.status === 'fulfilled') {
              const users = Array.isArray(usersRes.value) ? usersRes.value : [];
              totalUsers = users.length;
              lockedUsers = users.filter((item) => Boolean(item?.isLocked)).length;
              activeUsers = Math.max(0, totalUsers - lockedUsers);
            }

            if (auditStatsRes.status === 'fulfilled') {
              const statsPayload = auditStatsRes.value?.data || auditStatsRes.value || {};
              totalLogs = Number(statsPayload.totalLogs ?? 0);
            }

            setAdminSystemStats({
              totalUsers: Number(totalUsers || 0),
              activeUsers: Number(activeUsers || 0),
              lockedUsers: Number(lockedUsers || 0),
              totalLogs: Number(totalLogs || 0),
            });
          } catch {
            // giữ số liệu hiện tại
          }
        }

        if (role === 'REVIEWER') {
          try {
            const { allContents } = await fetchAllUnifiedContents(100);
            const normalizedUnified = sortByLatest(allContents).map((item) => ({
              ...item,
              entityType: String(item?.entityType || APPROVAL_ENTITY_TYPES.CONTENT).toUpperCase(),
              entityId: item?.entityId || item?.id,
              entityTitle: item?.title || '-',
            }));
            const reviewStatusContents = normalizedUnified.filter((item) =>
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
              totalContent: normalizedUnified.length,
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
            setPendingContent(reviewStatusContents.slice(0, 5));
            setStats({ totalContent: normalizedUnified.length, pendingReviews: pendingCount, totalUsers: 0, newSuggestions: 0 });
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
          if (role === 'CONTENT_EDITOR') {
            try {
              const { allContents } = await fetchAllUnifiedContents(100);
              const normalizedUnified = sortByLatest(allContents).map((item) => ({
                ...item,
                entityType: String(item?.entityType || APPROVAL_ENTITY_TYPES.CONTENT).toUpperCase(),
              }));
              const nextStatusMap = buildStatusMap(normalizedUnified);
              const pendingItems = normalizedUnified
                .filter((item) => normalizeStatus(item.status) === 'PENDING')
                .slice(0, 10)
                .map((item) => ({
                  ...item,
                  entityId: item?.entityId || item?.id,
                  entityTitle: item?.title || '-',
                }));

              setStatusCountMap(nextStatusMap);
              setContentByType(buildEntityTypeChartData(normalizedUnified));
              setContentByStatus(
                Object.entries(nextStatusMap).map(([name, value]) => ({
                  name: statusLabels[name] || name,
                  value,
                  color: statusColors[name] || 'hsl(215, 16%, 47%)',
                }))
              );
              setPendingContent(pendingItems);
              setStats({
                totalContent: normalizedUnified.length,
                pendingReviews: pendingItems.length,
                totalUsers: 0,
                newSuggestions: 0,
              });
            } catch {
              setStatusCountMap({});
              setContentByType([]);
              setContentByStatus([]);
              setPendingContent([]);
              setStats({ totalContent: 0, pendingReviews: 0, totalUsers: 0, newSuggestions: 0 });
            }
          } else {
            try {
              const { allContents, totalElements } = await fetchAllContents(100);
              const scopedSorted = sortByLatest(allContents);
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

              setStats((prev) => ({
                ...prev,
                totalContent: statsFromApi?.totalContent ?? totalElements ?? prev.totalContent,
                pendingReviews: statsFromApi?.pendingReviews ?? prev.pendingReviews,
              }));
            } catch {
              setStatusCountMap({});
              setContentByType([]);
              setContentByStatus([]);
            }
          }

          if (role === 'ADMIN') {
            try {
              const pendingRes = await approvalService.getPending('ALL', 0, 10);
              const pendingPayload = pendingRes?.data || pendingRes || {};
              const pendingData = Array.isArray(pendingPayload) ? pendingPayload : pendingPayload.content || [];
              const pendingTotal = Number(
                Array.isArray(pendingPayload)
                  ? pendingData.length
                  : pendingPayload.totalElements ?? pendingData.length
              );
              setPendingContent(
                pendingData.map((row) => ({
                  ...row,
                  entityId: row.entityId || row.id,
                  entityTitle: row.entityTitle || row.title || '-',
                  entityType: row.entityType || APPROVAL_ENTITY_TYPES.CONTENT,
                }))
              );

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

  useEffect(() => {
    if (role !== 'ADMIN') return;

    let alive = true;
    const fetchAdminAuditLogs = async () => {
      setAdminAuditLoading(true);
      try {
        const res = await auditLogService.getAll({ page: 0, size: 20 });
        if (!alive) return;

        const payload = res?.data || {};
        const rows = Array.isArray(payload.content) ? payload.content : [];
        const sortedRows = sortAuditLogsCreateFirst(rows);
        setAdminAuditRows(
          sortedRows.slice(0, ADMIN_AUDIT_LIMIT).map((row) => ({ ...row, id: row.logId || row.id }))
        );
      } catch {
        if (!alive) return;
        setAdminAuditRows([]);
      } finally {
        if (alive) {
          setAdminAuditLoading(false);
        }
      }
    };

    fetchAdminAuditLogs();
    return () => {
      alive = false;
    };
  }, [role]);

  useEffect(() => {
    if (role !== 'ADMIN') return;

    let alive = true;
    const fetchAdminSecurityAndSettings = async () => {
      setAdminSettingLoading(true);
      try {
        const [alertsRes, settingsRes] = await Promise.allSettled([
          auditLogService.getAll({ page: 0, size: 40 }),
          systemSettingService.getAllGrouped(),
        ]);
        if (!alive) return;

        if (alertsRes.status === 'fulfilled') {
          const payload = alertsRes.value?.data || {};
          const rows = Array.isArray(payload.content) ? payload.content : [];
          const nextAlerts = rows
            .filter((item) => {
              const actionType = String(item?.actionType || item?.action_type || '').toUpperCase();
              return securityAlertActionSet.has(actionType) || isAccessDeniedMessage(item?.description);
            })
            .slice(0, 6)
            .map((item) => {
              const meta = getSecurityAlertMeta(item);
              return {
                ...item,
                alertType: meta.label,
                tone: meta.tone,
                normalizedActionType: meta.actionType,
              };
            });
          setAdminSecurityAlerts(nextAlerts);
        } else {
          setAdminSecurityAlerts([]);
        }

        if (settingsRes.status === 'fulfilled') {
          const grouped = settingsRes.value?.data || {};
          const flattened = Object.values(grouped).flatMap((items) => (Array.isArray(items) ? items : []));
          const settingMap = new Map(flattened.map((item) => [item.settingKey, item]));

          const nextCriticalSettings = adminCriticalSettingConfigs.map((config) => {
            const found = settingMap.get(config.key);
            if (!found) {
              return {
                ...config,
                value: '—',
                updatedAt: null,
                statusTone: 'warn',
                statusLabel: 'Thiếu cấu hình',
                statusDetail: 'Chưa tìm thấy cài đặt trong hệ thống',
              };
            }

            const health = evaluateSettingHealth(config.key, found.settingValue);
            return {
              ...config,
              value: found.settingValue,
              updatedAt: found.updatedAt,
              statusTone: health.tone,
              statusLabel: health.label,
              statusDetail: health.detail,
            };
          });

          setAdminCriticalSettings(nextCriticalSettings);
        } else {
          setAdminCriticalSettings([]);
        }
      } finally {
        if (alive) {
          setAdminSettingLoading(false);
        }
      }
    };

    fetchAdminSecurityAndSettings();
    return () => {
      alive = false;
    };
  }, [role]);

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
        { title: 'Tổng nội dung', value: stats.totalContent, icon: FileText },
        { title: 'Nháp', value: getStatusCount(statusCountMap, 'DRAFT'), icon: PenSquare },
        { title: 'Chờ duyệt', value: stats.pendingReviews, icon: Clock },
        { title: 'Đã xuất bản', value: getStatusCount(statusCountMap, 'PUBLISHED'), icon: CheckCircle },
      ];
    }

    return [
      { title: 'Tổng người dùng', value: adminSystemStats.totalUsers, icon: Users },
      { title: 'Đang hoạt động', value: adminSystemStats.activeUsers, icon: CheckCircle },
      { title: 'Đã khóa', value: adminSystemStats.lockedUsers, icon: Lock },
      { title: 'Tổng nhật ký', value: adminSystemStats.totalLogs, icon: ClipboardList },
    ];
  }, [adminSystemStats, role, reviewerStatusSummary, stats, statusCountMap]);

  const quickActions = quickActionsByRole[role] || quickActionsByRole.ADMIN;
  const showActivityTable = role === 'ADMIN';
  const isEditorDashboard = role === 'CONTENT_EDITOR';

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

  const formatDateTimeInline = (value) => {
    const parts = getDateTimeParts(value);
    if (!parts) return '—';
    return `${parts.time} ${parts.date}`.trim();
  };

  const adminSecurityToneConfig = {
    danger: {
      icon: ShieldAlert,
      iconClass: 'text-rose-600 dark:text-rose-300',
      badgeClass: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-amber-600 dark:text-amber-300',
      badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    info: {
      icon: ShieldAlert,
      iconClass: 'text-blue-600 dark:text-blue-300',
      badgeClass: 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    },
  };

  const adminSettingToneConfig = {
    ok: {
      icon: CheckCheck,
      iconClass: 'text-emerald-600 dark:text-emerald-300',
      badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    warn: {
      icon: AlertTriangle,
      iconClass: 'text-amber-600 dark:text-amber-300',
      badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    info: {
      icon: Wrench,
      iconClass: 'text-sky-600 dark:text-sky-300',
      badgeClass: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
  };

  const adminAuditColumns = [
    {
      key: 'username',
      header: 'Người dùng',
      className: 'w-44',
      render: (row) => row.fullName || row.username || 'Hệ thống',
    },
    {
      key: 'actionType',
      header: 'Thao tác',
      className: 'w-44 whitespace-nowrap',
      render: (row) => {
        const actionType = String(row.actionType || row.action_type || '').toUpperCase();
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getAuditActionBadgeClass(actionType)}`}>
            {resolveAuditActionLabel(actionType)}
          </span>
        );
      },
    },
    {
      key: 'entityType',
      header: 'Đối tượng',
      className: 'w-44',
      render: (row) => resolveAuditEntityLabel(row.entityType || row.entity_type),
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (row) => getAuditDescriptionVi(row.description, { actionType: row.actionType || row.action_type, entityType: row.entityType || row.entity_type }),
    },
    {
      key: 'actionTimestamp',
      header: 'Thời gian',
      className: 'w-44',
      render: (row) => renderDateTimeCell(row.actionTimestamp || row.action_timestamp),
    },
  ];

  const activityColumns = [
    { key: 'user', header: 'Người dùng', render: (row) => row.user?.full_name || row.user || row.username || '-' },
    { key: 'action_type', header: 'Hành động', render: (row) => row.action_type || row.actionType || '-' },
    { key: 'entity_type', header: 'Đối tượng', render: (row) => row.entity_type || row.entityType || '-' },
    { key: 'action_timestamp', header: 'Thời gian', render: (row) => renderDateTimeCell(row.action_timestamp || row.actionTimestamp || row.createdAt) },
  ];

  const pendingColumns = [
    { key: 'title', header: 'Tiêu đề', render: (row) => <span className="font-medium">{getPendingTitle(row)}</span> },
    { key: 'content_type', header: 'Loại', render: (row) => getPendingTypeLabel(row) },
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
        ? 'Danh sách nội dung đang chờ duyệt'
        : 'Nội dung chờ duyệt';

  const pendingEmptyMessage =
    role === 'REVIEWER'
      ? 'Không có nội dung ở trạng thái duyệt'
      : role === 'CONTENT_EDITOR'
        ? 'Không có nội dung nào đang chờ duyệt'
        : 'Không có nội dung chờ duyệt';

  const renderQuickActionsCard = (delay = 0.3) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
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
  );

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

      {role === 'ADMIN' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 mb-6">
          <div className="xl:col-span-8 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <div className="bg-card rounded-xl border border-border/60">
                <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Nhật ký kiểm tra gần đây</h3>
                    <p className="text-xs text-muted-foreground mt-1">Hiển thị 5 bản ghi mới nhất</p>
                  </div>
                  <Link to="/system/audit-logs" className="text-xs font-medium text-accent hover:underline">
                    Xem đầy đủ
                  </Link>
                </div>
                <div className="px-6 pb-5">
                  <DataTable
                    columns={adminAuditColumns}
                    data={adminAuditRows}
                    loading={adminAuditLoading}
                    emptyMessage="Chưa có dữ liệu nhật ký phù hợp"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div className="bg-card rounded-xl border border-border/60">
                <div className="px-6 pt-5 pb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground">Tình trạng cấu hình hệ thống</h3>
                  <Link to="/system/settings" className="text-xs font-medium text-accent hover:underline">
                    Mở cài đặt
                  </Link>
                </div>
                <div className="px-6 pb-5 space-y-3">
                  {adminSettingLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
                      ))}
                    </div>
                  ) : adminCriticalSettings.length > 0 ? (
                    <div className="space-y-2">
                      {adminCriticalSettings.slice(0, 2).map((item, index) => {
                        const toneConfig = adminSettingToneConfig[item.statusTone] || adminSettingToneConfig.info;
                        const Icon = toneConfig.icon;
                        return (
                          <div key={`${item.key}-${index}`} className="rounded-lg border border-border/50 bg-background p-3">
                            <div className="flex items-start gap-2">
                              <Icon className={`h-4 w-4 mt-0.5 ${toneConfig.iconClass}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-foreground break-words">{item.label}</p>
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneConfig.badgeClass}`}>
                                    {item.statusLabel}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{item.statusDetail}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  Cập nhật: {formatDateTimeInline(item.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/40 bg-background py-8 text-center text-sm text-muted-foreground">
                      Không tải được trạng thái cấu hình
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          </div>

          <div className="xl:col-span-4 space-y-4">
            {renderQuickActionsCard(0.28)}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <div className="bg-card rounded-xl border border-border/60">
                <div className="px-6 pt-5 pb-3">
                  <h3 className="text-base font-semibold text-foreground">Cảnh báo bảo mật mới nhất</h3>
                </div>
                <div className="px-6 pb-5">
                  {adminSecurityAlerts.length > 0 ? (
                    <div className="space-y-2">
                      {adminSecurityAlerts.map((item, index) => {
                        const toneConfig = adminSecurityToneConfig[item.tone] || adminSecurityToneConfig.info;
                        const Icon = toneConfig.icon;
                        return (
                          <div key={`${item.logId || item.id || 'alert'}-${index}`} className="rounded-lg border border-border/50 bg-background p-3">
                            <div className="flex items-start gap-2">
                              <Icon className={`h-4 w-4 mt-0.5 ${toneConfig.iconClass}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneConfig.badgeClass}`}>
                                    {item.alertType}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatDateTimeInline(item.actionTimestamp || item.action_timestamp)}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground mt-1 break-words">
                                  {getAuditDescriptionVi(item.description, { actionType: item.normalizedActionType, entityType: item.entityType || item.entity_type }) || resolveAuditActionLabel(item.normalizedActionType)}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  {item.fullName || item.username || 'Hệ thống'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/40 bg-background py-8 text-center text-sm text-muted-foreground">
                      Chưa có cảnh báo bảo mật mới
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {role !== 'ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {renderQuickActionsCard(0.3)}

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
                    <BarChart
                      data={contentByType}
                      margin={isEditorDashboard
                        ? { top: 6, right: 8, left: 8, bottom: 16 }
                        : { top: 6, right: 8, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        height={isEditorDashboard ? 52 : 40}
                        tickMargin={isEditorDashboard ? 10 : 8}
                        angle={isEditorDashboard ? -12 : 0}
                        textAnchor={isEditorDashboard ? 'end' : 'middle'}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
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
                  <div className="h-[210px] bg-muted/30 rounded animate-pulse" />
                ) : statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="54%"
                        outerRadius={64}
                        innerRadius={38}
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
      )}

      {role !== 'ADMIN' && (
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
                  <FilterSelect
                    value={activityLimit}
                    onChange={(nextValue) => setActivityLimit(Number(nextValue))}
                    options={activityLimitOptions}
                    className="w-[104px]"
                    buttonClassName="h-8 min-w-0 px-2 text-xs rounded-md"
                    optionClassName="text-xs py-1.5"
                  />
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
      )}
    </div>
  );
};

export default DashboardPage;
