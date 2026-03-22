import api, { ApiResponse, PageResponse, unwrapApiData } from './api';

export type NotificationType =
  | 'CONTENT_SUBMITTED'
  | 'CONTENT_APPROVED'
  | 'CONTENT_REJECTED'
  | 'CONTENT_REVISION_REQUESTED'
  | 'CONTENT_PUBLISHED'
  | 'CONTENT_UNPUBLISHED'
  | 'SUGGESTION_SUBMITTED'
  | 'SUGGESTION_REVIEWED';

export interface NotificationItem {
  notificationId: number;
  senderId: number | null;
  senderName: string | null;
  type: NotificationType | null;
  title: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  isRead: boolean;
  createdAt: string;
}

interface UnreadCountResponse {
  count: number;
}

export const notificationService = {
  async getNotifications(page = 0, size = 40): Promise<PageResponse<NotificationItem>> {
    const response = await api.get('/notifications', {
      params: { page, size },
    }) as ApiResponse<PageResponse<NotificationItem>>;

    return unwrapApiData(response);
  },

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count') as ApiResponse<UnreadCountResponse>;
    return unwrapApiData(response).count ?? 0;
  },

  async markAsRead(notificationId: number): Promise<void> {
    const response = await api.put(`/notifications/${notificationId}/read`) as ApiResponse<null>;
    unwrapApiData(response);
  },

  async markAllAsRead(): Promise<void> {
    const response = await api.put('/notifications/read-all') as ApiResponse<null>;
    unwrapApiData(response);
  },
};
