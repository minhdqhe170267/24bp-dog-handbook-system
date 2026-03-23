import api from './api';

const buildQuery = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

export const notificationService = {
  getNotifications: (page = 0, size = 20) =>
    api.get(`/notifications?${buildQuery({ page, size })}`),

  getUnreadCount: () => api.get('/notifications/unread-count'),

  markAsRead: (id) => api.put(`/notifications/${id}/read`),

  markAllAsRead: () => api.put('/notifications/read-all'),
};

