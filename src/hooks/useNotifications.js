import { useState, useEffect, useCallback, useRef } from 'react';
import * as notificationService from '../services/notificationService.js';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await notificationService.fetchNotifications();
      setNotifications(data.items);
      // Update unread count
      const unread = data.items.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        await notificationService.markAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        setError(err.message);
        console.error('Failed to mark as read:', err);
      }
    },
    [],
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      // Recalculate unread count
      setNotifications((prev) => {
        const unread = prev.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
        return prev;
      });
    } catch (err) {
      setError(err.message);
      console.error('Failed to delete notification:', err);
    }
  }, []);

  // Initial fetch and subscribe to updates
  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time updates
    const unsubscribe = notificationService.subscribeToNotifications((e) => {
      if (e.action === 'create') {
        setNotifications((prev) => [e.record, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } else if (e.action === 'update') {
        setNotifications((prev) =>
          prev.map((n) => (n.id === e.record.id ? e.record : n)),
        );
        // Recalculate unread count
        fetchNotifications();
      } else if (e.action === 'delete') {
        setNotifications((prev) => prev.filter((n) => n.id !== e.record.id));
        // Recalculate unread count
        fetchNotifications();
      }
    });

    unsubscribeRef.current = unsubscribe || (() => {});

    return () => {
      if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
      }
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
