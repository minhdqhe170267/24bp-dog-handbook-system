import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { notificationService } from '../services/notificationService';

const POLLING_INTERVAL_MS = 30000;
const MAX_NOTIFICATION_BUFFER = 100;

const getWsEndpoint = () => {
  const rawBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const normalizedBase = String(rawBase || '').replace(/\/+$/, '');
  return `${normalizedBase}/ws`;
};

const toNotificationList = (res) => {
  const content = res?.data?.content;
  return Array.isArray(content) ? content : [];
};

const toUnreadCount = (res) => Number(res?.data?.count || 0);

export const useNotifications = ({ userId, pageSize = 10, enabled = true } = {}) => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingUnreadCount, setLoadingUnreadCount] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastError, setLastError] = useState(null);

  const clientRef = useRef(null);
  const pollingRef = useRef(null);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const mergeIncoming = useCallback((incoming) => {
    if (!incoming || typeof incoming !== 'object') return;

    setItems((prev) => {
      const incomingId = incoming.notificationId;
      if (!incomingId) return prev;

      const exists = prev.some((item) => item.notificationId === incomingId);
      if (exists) {
        return prev.map((item) =>
          item.notificationId === incomingId ? { ...item, ...incoming } : item
        );
      }

      const nextLimit = Math.max(pageSize, MAX_NOTIFICATION_BUFFER);
      return [incoming, ...prev].slice(0, nextLimit);
    });

    if (!incoming?.isRead) {
      setUnreadCount((prev) => prev + 1);
    }
  }, [pageSize]);

  const fetchNotifications = useCallback(async () => {
    if (!enabled || !userId) return [];

    setLoadingList(true);
    try {
      const res = await notificationService.getNotifications(0, pageSize);
      const nextItems = toNotificationList(res);
      setItems(nextItems);
      setLastError(null);
      return nextItems;
    } catch (error) {
      setLastError(error);
      throw error;
    } finally {
      setLoadingList(false);
    }
  }, [enabled, pageSize, userId]);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled || !userId) return 0;

    setLoadingUnreadCount(true);
    try {
      const res = await notificationService.getUnreadCount();
      const count = toUnreadCount(res);
      setUnreadCount(count);
      setLastError(null);
      return count;
    } catch (error) {
      setLastError(error);
      throw error;
    } finally {
      setLoadingUnreadCount(false);
    }
  }, [enabled, userId]);

  const refresh = useCallback(async () => {
    await Promise.allSettled([fetchNotifications(), refreshUnreadCount()]);
  }, [fetchNotifications, refreshUnreadCount]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!notificationId) return;

      const target = items.find((item) => item.notificationId === notificationId);
      const wasUnread = Boolean(target && !target.isRead);

      setItems((prev) =>
        prev.map((item) => {
          if (item.notificationId !== notificationId) return item;
          return { ...item, isRead: true };
        })
      );
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await notificationService.markAsRead(notificationId);
        setLastError(null);
      } catch (error) {
        await Promise.allSettled([fetchNotifications(), refreshUnreadCount()]);
        setLastError(error);
        throw error;
      }
    },
    [fetchNotifications, items, refreshUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    if (!enabled || !userId) return;

    const prevItems = items;
    const prevUnread = unreadCount;

    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead();
      setLastError(null);
    } catch (error) {
      setItems(prevItems);
      setUnreadCount(prevUnread);
      setLastError(error);
      throw error;
    }
  }, [enabled, items, unreadCount, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      setItems([]);
      setUnreadCount(0);
      setRealtimeConnected(false);
      setLastError(null);
      clearPolling();
      return undefined;
    }

    refresh();
    return undefined;
  }, [clearPolling, enabled, refresh, userId]);

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const wsClient = new Client({
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      webSocketFactory: () => new SockJS(getWsEndpoint()),
      debug: () => {},
    });

    wsClient.onConnect = () => {
      setRealtimeConnected(true);
      setLastError(null);
      clearPolling();
      wsClient.subscribe(`/topic/notifications/${userId}`, (frame) => {
        try {
          const payload = JSON.parse(frame.body || '{}');
          mergeIncoming(payload);
        } catch {
          // Ignore malformed payload from server.
        }
      });
    };

    wsClient.onWebSocketClose = () => {
      setRealtimeConnected(false);
    };

    wsClient.onWebSocketError = () => {
      setRealtimeConnected(false);
    };

    wsClient.onStompError = () => {
      setRealtimeConnected(false);
    };

    clientRef.current = wsClient;
    wsClient.activate();

    return () => {
      setRealtimeConnected(false);
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [clearPolling, enabled, mergeIncoming, userId]);

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    if (realtimeConnected) {
      clearPolling();
      return undefined;
    }

    if (!pollingRef.current) {
      pollingRef.current = setInterval(() => {
        refresh();
      }, POLLING_INTERVAL_MS);
    }

    return () => {
      clearPolling();
    };
  }, [clearPolling, enabled, realtimeConnected, refresh, userId]);

  useEffect(() => {
    if (!enabled || !userId) return undefined;

    const handleRefreshRequest = () => {
      refresh();
    };

    window.addEventListener('notifications:refresh', handleRefreshRequest);
    return () => {
      window.removeEventListener('notifications:refresh', handleRefreshRequest);
    };
  }, [enabled, refresh, userId]);

  useEffect(
    () => () => {
      clearPolling();
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    },
    [clearPolling]
  );

  return useMemo(
    () => ({
      items,
      unreadCount,
      loadingList,
      loadingUnreadCount,
      realtimeConnected,
      lastError,
      refresh,
      refreshUnreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      fetchNotifications,
      items,
      lastError,
      loadingList,
      loadingUnreadCount,
      markAllAsRead,
      markAsRead,
      realtimeConnected,
      refresh,
      refreshUnreadCount,
      unreadCount,
    ]
  );
};
