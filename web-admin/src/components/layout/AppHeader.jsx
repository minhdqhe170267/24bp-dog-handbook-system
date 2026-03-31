import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2, LogOut, Moon, Search, Sun, User } from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/utils';
import { useToast } from '../ui/Toast';
import { useNotifications } from '../../hooks/useNotifications';
import { useTheme } from '../../hooks/useTheme';
import { approvalService } from '../../services/approvalService';
import api from '../../services/api';
import {
  formatNotificationTime,
  getNotificationFeedbackMeta,
  groupNotificationsByRecency,
  getNotificationEntityLabel,
  getNotificationTypeLabel,
  resolveNotificationRoute,
} from '../../utils/notificationUtils';

const searchItems = [
  { label: 'Dashboard', href: '/dashboard', keywords: ['tong quan', 'tổng quan', 'dashboard'] },
  { label: 'Hồ sơ cá nhân', href: '/profile', keywords: ['ho so', 'hồ sơ', 'profile', 'ca nhan', 'cá nhân'] },
  { label: 'Giống chó', href: '/breeds', keywords: ['giong', 'giống', 'cho', 'chó', 'breed'] },
  { label: 'Hồ sơ chó', href: '/dogs', keywords: ['quan ly cho', 'quản lý chó', 'ho so cho', 'hồ sơ chó', 'dogs'] },
  { label: 'Phân công chó', href: '/assignments', keywords: ['phan cong', 'phân công', 'assign', 'trainer'] },
  { label: 'Bệnh', href: '/diseases', keywords: ['benh', 'bệnh', 'disease'] },
  { label: 'Thuốc', href: '/medications', keywords: ['thuoc', 'thuốc', 'medication'] },
  { label: 'Dinh dưỡng', href: '/nutrition', keywords: ['dinh duong', 'dinh dưỡng', 'nutrition'] },
  { label: 'Phương pháp', href: '/training/methods', keywords: ['phuong phap', 'phương pháp', 'method'] },
  { label: 'Bài tập', href: '/training/exercises', keywords: ['bai tap', 'bài tập', 'exercise'] },
  { label: 'Lộ trình', href: '/training/roadmaps', keywords: ['lo trinh', 'lộ trình', 'roadmap'] },
  { label: 'Sơ cứu', href: '/medical', keywords: ['y te', 'y tế', 'medical', 'so cuu', 'sơ cứu'] },
  {
    label: 'Nội dung đề xuất',
    href: '/suggestions',
    keywords: ['noi dung de xuat', 'nội dung đề xuất', 'de xuat noi dung', 'đề xuất nội dung', 'suggestions'],
  },
  { label: 'Thông báo', href: '/notifications', keywords: ['thong bao', 'thông báo', 'notifications', 'notify'] },
  {
    label: 'Xung đột đồng bộ',
    href: '/sync-conflicts',
    keywords: ['xung dot', 'xung đột', 'dong bo', 'đồng bộ', 'sync conflict'],
  },
  { label: 'Import dữ liệu', href: '/import-data', keywords: ['import', 'nhap du lieu', 'nhập dữ liệu', 'excel', 'csv'] },
  { label: 'Export dữ liệu', href: '/export-data', keywords: ['export', 'xuat du lieu', 'xuất dữ liệu', 'bao cao', 'báo cáo'] },
  { label: 'Quản lý người dùng', href: '/system/users', keywords: ['nguoi dung', 'người dùng', 'user', 'users'] },
  { label: 'Cài đặt hệ thống', href: '/system/settings', keywords: ['cai dat', 'cài đặt', 'settings', 'he thong', 'hệ thống'] },
  { label: 'Nhật ký kiểm tra', href: '/system/audit-logs', keywords: ['nhat ky', 'nhật ký', 'audit', 'log'] },
];

const AppHeader = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();

  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState(null);
  const [reviewFeedbackByKey, setReviewFeedbackByKey] = useState({});

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const notificationPageSize = user?.role === 'ADMIN' ? 50 : 30;

  const {
    items: notifications,
    unreadCount,
    loadingList: notificationLoading,
    refresh: refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications({
    userId: user?.userId,
    pageSize: notificationPageSize,
    enabled: Boolean(user?.userId),
  });

  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) return searchItems.slice(0, 6);
    const q = searchValue.toLowerCase();
    return searchItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q))
    );
  }, [searchValue]);

  useEffect(() => setSelectedIndex(0), [searchValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchFocused(false);
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (href) => {
    navigate(href);
    setSearchValue('');
    setSearchFocused(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, filteredItems.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && filteredItems[selectedIndex]) {
      handleSelect(filteredItems[selectedIndex].href);
    } else if (event.key === 'Escape') {
      setSearchFocused(false);
    }
  };

  const initials =
    user?.fullName
      ?.split(' ')
      .map((word) => word[0])
      .slice(-2)
      .join('')
      .toUpperCase() || '?';

  const unreadBadge = unreadCount > 99 ? '99+' : String(unreadCount);
  const filteredNotifications = useMemo(() => {
    const source =
      notificationFilter === 'unread'
        ? notifications.filter((item) => !item?.isRead)
        : notifications;

    return [...source].sort((a, b) => {
      const timeA = new Date(a?.createdAt || 0).getTime();
      const timeB = new Date(b?.createdAt || 0).getTime();
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
  }, [notificationFilter, notifications]);

  const groupedNotifications = useMemo(() => {
    return groupNotificationsByRecency(filteredNotifications);
  }, [filteredNotifications]);

  useEffect(() => {
    let active = true;

    const feedbackMetaByKey = new Map();
    notifications.forEach((notification) => {
      const meta = getNotificationFeedbackMeta(notification);
      if (meta && !feedbackMetaByKey.has(meta.key)) {
        feedbackMetaByKey.set(meta.key, meta);
      }
    });

    const missingMetas = Array.from(feedbackMetaByKey.values()).filter(
      (meta) => !(meta.key in reviewFeedbackByKey)
    );
    if (missingMetas.length === 0) return () => { active = false; };

    const fetchFeedback = async () => {
      const nextMap = {};

      await Promise.all(
        missingMetas.map(async (meta) => {
          try {
            if (meta.source === 'approval') {
              const res = await approvalService.getHistory(meta.entityType, meta.entityId);
              const payload = res?.data || res || [];
              const records = Array.isArray(payload) ? payload : payload.content || [];
              const latestRecord = records[0];
              nextMap[meta.key] = latestRecord && String(latestRecord?.comments || '').trim()
                ? {
                    comments: latestRecord.comments,
                    reviewerName: latestRecord.reviewerName,
                  }
                : null;
              return;
            }

            if (meta.source === 'suggestion') {
              const res = await api.get(`/suggestions/${meta.entityId}`);
              const detail = res?.data || res || {};
              const comments = String(detail?.adminResponse || '').trim();
              nextMap[meta.key] = comments
                ? {
                    comments,
                    reviewerName: detail?.reviewedByName || null,
                  }
                : null;
              return;
            }

            nextMap[meta.key] = null;
          } catch {
            nextMap[meta.key] = null;
          }
        })
      );

      if (!active) return;
      setReviewFeedbackByKey((prev) => ({ ...prev, ...nextMap }));
    };

    fetchFeedback();
    return () => {
      active = false;
    };
  }, [notifications, reviewFeedbackByKey]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleNotifications = async () => {
    const next = !notificationOpen;
    setNotificationOpen(next);
    setDropdownOpen(false);

    if (!next) return;

    try {
      await refreshNotifications();
    } catch (error) {
      toast.error(error, { title: 'Không tải được danh sách thông báo' });
    }
  };

  const handleNotificationSelect = async (notification) => {
    const targetRoute = resolveNotificationRoute(notification, { role: user?.role });
    const notificationId = notification?.notificationId;

    try {
      if (notificationId && !notification?.isRead) {
        setActiveNotificationId(notificationId);
        await markAsRead(notificationId);
      }
    } catch (error) {
      toast.error(error, { title: 'Không thể cập nhật trạng thái thông báo' });
    } finally {
      setActiveNotificationId(null);
      setNotificationOpen(false);
      navigate(targetRoute);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount <= 0) return;
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (error) {
      toast.error(error, { title: 'Không thể đánh dấu đã đọc tất cả' });
    } finally {
      setMarkingAll(false);
    }
  };

  const renderNotificationItems = (items) =>
    items.map((notification) => {
      const id = notification.notificationId || `${notification.type}-${notification.createdAt}`;
      const isActionLoading = activeNotificationId === notification.notificationId;
      const feedbackMeta = getNotificationFeedbackMeta(notification);
      const feedback = feedbackMeta ? reviewFeedbackByKey[feedbackMeta.key] : null;
      return (
        <button
          key={id}
          className={cn(
            'w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted transition-colors',
            notification?.isRead ? 'bg-card' : 'bg-accent/5'
          )}
          onClick={() => handleNotificationSelect(notification)}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {notification?.title || 'Thông báo mới'}
            </p>
            <div className="flex items-center gap-1.5">
              {!notification?.isRead && (
                <span className="h-2 w-2 rounded-full bg-accent mt-1 shrink-0" />
              )}
              <span className="text-[11px] text-muted-foreground">
                {formatNotificationTime(notification?.createdAt)}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {notification?.message || 'Không có nội dung thông báo'}
          </p>
          {feedback?.comments ? (
            <p className="mt-1 text-xs text-foreground leading-relaxed line-clamp-2">
              <span className="font-medium">
                Phản hồi reviewer{feedback?.reviewerName ? ` (${feedback.reviewerName})` : ''}:
              </span>{' '}
              {feedback.comments}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium">
            <span className="px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
              {getNotificationTypeLabel(notification?.type)}
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              {getNotificationEntityLabel(notification?.entityType)}
            </span>
            {isActionLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
        </button>
      );
    });

  return (
    <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-5 gap-4 flex-shrink-0 sticky top-0 z-20">
      <div
        ref={searchRef}
        className={cn(
          'relative transition-all duration-300 ease-out',
          searchFocused ? 'flex-1 max-w-lg' : 'w-72'
        )}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          type="text"
          placeholder="Tìm kiếm nhanh..."
          className="w-full pl-9 h-9 bg-muted/50 border border-border/60 rounded-lg text-sm outline-none focus:bg-card focus:border-accent/40 transition-all"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          onFocus={() => setSearchFocused(true)}
          onKeyDown={handleKeyDown}
        />
        <AnimatePresence>
          {searchFocused && (
            <Motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/60 rounded-lg shadow-elevated overflow-hidden z-50"
            >
              {filteredItems.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Không tìm thấy kết quả cho &ldquo;{searchValue}&rdquo;
                </div>
              ) : (
                <div className="py-1.5">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {searchValue ? 'Kết quả' : 'Truy cập nhanh'}
                  </p>
                  {filteredItems.map((item, index) => (
                    <button
                      key={item.href}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left',
                        index === selectedIndex ? 'bg-accent/10 text-accent' : 'hover:bg-muted/50'
                      )}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => handleSelect(item.href)}
                    >
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          {isDark ? (
            <Sun className="h-[18px] w-[18px] text-warning" />
          ) : (
            <Moon className="h-[18px] w-[18px] text-muted-foreground" />
          )}
        </button>

        <div className="relative" ref={notificationRef}>
          <button
            className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            onClick={handleToggleNotifications}
            title="Thông báo"
          >
            <Bell className="h-[18px] w-[18px] text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full gradient-primary text-[10px] text-accent-foreground flex items-center justify-center font-semibold">
                {unreadBadge}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notificationOpen && (
              <Motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-[420px] max-w-[92vw] bg-card border border-border/60 rounded-lg shadow-elevated overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                  <p className="text-lg font-bold leading-none">Thông báo</p>
                  <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={cn(
                        'px-2.5 py-1 text-[11.5px] rounded-full transition-colors leading-none',
                        notificationFilter === 'all' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('unread')}
                      className={cn(
                        'px-2.5 py-1 text-[11.5px] rounded-full transition-colors leading-none',
                        notificationFilter === 'unread' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Chưa đọc
                    </button>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notificationLoading && notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải thông báo...
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                      Chưa có thông báo nào
                    </div>
                  ) : (
                    <>
                      {groupedNotifications.recent.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-semibold text-foreground bg-muted/55 border-b border-border/60">
                          Mới
                        </div>
                      )}
                      {renderNotificationItems(groupedNotifications.recent)}

                      {groupedNotifications.today.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-semibold text-foreground bg-muted/55 border-b border-border/60">
                          Hôm nay
                        </div>
                      )}
                      {renderNotificationItems(groupedNotifications.today)}

                      {groupedNotifications.previous.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-semibold text-foreground bg-muted/55 border-b border-border/60">
                          Trước đó
                        </div>
                      )}
                      {renderNotificationItems(groupedNotifications.previous)}
                    </>
                  )}
                </div>
                <div className="px-3 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between">
                  <button
                    className="text-xs font-medium text-accent hover:underline"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate('/notifications');
                    }}
                  >
                    Xem tất cả
                  </button>
                  <button
                    className="text-xs px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-60"
                    onClick={handleMarkAllRead}
                    disabled={markingAll || unreadCount <= 0}
                  >
                    <span className="inline-flex items-center gap-1">
                      {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                      Đánh dấu tất cả đã đọc
                    </span>
                  </button>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotificationOpen(false);
            }}
            className="flex items-center gap-2.5 h-9 px-2 hover:bg-muted transition-colors rounded-lg"
          >
            <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center ring-2 ring-accent/20">
              <span className="text-[11px] font-semibold text-accent-foreground">{initials}</span>
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold leading-none text-foreground">{user?.fullName || user?.username}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{user?.role || 'Admin'}</p>
            </div>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <Motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-56 bg-card border border-border/60 rounded-lg shadow-elevated overflow-hidden z-50"
              >
                <div className="px-3 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                      <span className="text-sm font-semibold text-accent-foreground">{initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{user?.fullName || user?.username}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                        {user?.role || 'Admin'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                  >
                    <User className="h-4 w-4" />
                    Hồ sơ cá nhân
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                    onClick={(event) => {
                      setDropdownOpen(false);
                      toggleTheme(event);
                    }}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
                  </button>
                </div>
                <div className="border-t border-border py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
