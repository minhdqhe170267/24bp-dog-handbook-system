import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Eye, Loader2 } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import { useToast } from '../../components/ui/Toast';
import { notificationService } from '../../services/notificationService';
import {
  formatNotificationTime,
  getNotificationEntityLabel,
  getNotificationTypeLabel,
  resolveNotificationRoute,
} from '../../utils/notificationUtils';

const formatDatePart = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('vi-VN');
};

const NotificationStatusBadge = ({ isRead }) => (
  <span
    className={[
      'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border whitespace-nowrap',
      isRead
        ? 'bg-muted text-muted-foreground border-border'
        : 'bg-accent/10 text-accent border-accent/25',
    ].join(' ')}
  >
    <span className={['h-1.5 w-1.5 rounded-full flex-shrink-0', isRead ? 'bg-muted-foreground' : 'bg-accent'].join(' ')} />
    {isRead ? 'Đã đọc' : 'Chưa đọc'}
  </span>
);

const NotificationsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [rowActionLoadingId, setRowActionLoadingId] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 20,
    totalItems: 0,
  });

  const fetchData = useCallback(
    async (page = pagination.page, pageSize = pagination.pageSize) => {
      setLoading(true);
      try {
        const res = await notificationService.getNotifications(page, pageSize);
        const pageData = res?.data || {};
        const content = Array.isArray(pageData.content) ? pageData.content : [];

        setRows(content);
        setPagination({
          page: Number.isFinite(pageData.page) ? pageData.page : page,
          pageSize: Number.isFinite(pageData.size) ? pageData.size : pageSize,
          totalItems: Number.isFinite(pageData.totalElements) ? pageData.totalElements : content.length,
        });
      } catch (error) {
        toast.error(error, { title: 'Không tải được danh sách thông báo' });
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.pageSize, toast]
  );

  useEffect(() => {
    fetchData(0, pagination.pageSize);
  }, [fetchData, pagination.pageSize]);

  const dispatchNotificationRefresh = () => {
    window.dispatchEvent(new Event('notifications:refresh'));
  };

  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) return;
    setRowActionLoadingId(notificationId);
    try {
      await notificationService.markAsRead(notificationId);
      setRows((prev) =>
        prev.map((item) =>
          item.notificationId === notificationId ? { ...item, isRead: true } : item
        )
      );
      dispatchNotificationRefresh();
    } catch (error) {
      toast.error(error, { title: 'Không thể đánh dấu đã đọc' });
    } finally {
      setRowActionLoadingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setRows((prev) => prev.map((item) => ({ ...item, isRead: true })));
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
      dispatchNotificationRefresh();
    } catch (error) {
      toast.error(error, { title: 'Không thể đánh dấu tất cả đã đọc' });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCountInPage = useMemo(
    () => rows.filter((item) => !item?.isRead).length,
    [rows]
  );

  const columns = [
    {
      key: 'title',
      header: 'Tiêu đề',
      className: 'min-w-[300px]',
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row?.title || 'Thông báo'}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {row?.message || 'Không có nội dung'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Loại',
      className: 'whitespace-nowrap',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
          {getNotificationTypeLabel(row?.type)}
        </span>
      ),
    },
    {
      key: 'entityType',
      header: 'Đối tượng',
      className: 'whitespace-nowrap',
      render: (row) => getNotificationEntityLabel(row?.entityType),
    },
    {
      key: 'senderName',
      header: 'Người gửi',
      className: 'whitespace-nowrap',
      render: (row) => row?.senderName || '--',
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      className: 'whitespace-nowrap',
      render: (row) => (
        <div className="leading-tight">
          <p className="font-medium">{formatNotificationTime(row?.createdAt)}</p>
          <p className="text-xs text-muted-foreground">{formatDatePart(row?.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'isRead',
      header: 'Trạng thái',
      className: 'whitespace-nowrap',
      render: (row) => <NotificationStatusBadge isRead={Boolean(row?.isRead)} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'whitespace-nowrap',
      render: (row) => {
        const route = resolveNotificationRoute(row);
        const isRowLoading = rowActionLoadingId === row?.notificationId;

        return (
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              onClick={() => navigate(route)}
              title="Mở chi tiết"
            >
              <Eye className="h-4 w-4" />
            </button>
            {!row?.isRead && (
              <button
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-accent"
                onClick={() => handleMarkAsRead(row?.notificationId)}
                title="Đánh dấu đã đọc"
                disabled={isRowLoading}
              >
                {isRowLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thông báo"
        description="Theo dõi toàn bộ thông báo hệ thống dành cho tài khoản của bạn"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Thông báo' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={markingAll || unreadCountInPage <= 0}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-60"
            >
              {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Đánh dấu tất cả đã đọc
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={(nextPage) => fetchData(nextPage, pagination.pageSize)}
          onPageSizeChange={(nextPageSize) => fetchData(0, nextPageSize)}
          emptyMessage="Chưa có thông báo"
          emptyIcon={<Bell className="h-12 w-12 opacity-40" />}
        />
      </div>
    </div>
  );
};

export default NotificationsPage;

