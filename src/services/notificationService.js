import { getPocketBase } from './pocketbase.js';

/**
 * Notification Service
 * Handles all notification-related API calls and demo data fallback
 * @module notificationService
 */

function getPb() {
  const pb = getPocketBase();
  if (!pb) {
    throw new Error('PocketBase not initialized');
  }
  return pb;
}

function getPocketBaseInstance() {
  try {
    return getPocketBase();
  } catch {
    return null;
  }
}

function isDevMode() {
  const pb = getPocketBaseInstance();
  return import.meta.env.DEV || !pb?.authStore?.isValid;
}

// Demo notifications for development/testing
const DEMO_NOTIFICATIONS = [
  {
    id: '1',
    title: 'New Course Released',
    message: 'A new 3D Design course is now available',
    isRead: false,
    icon: '/assets/notifications/Circle.svg',
    created: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: '2',
    title: 'Flash Sale: 25% Off',
    message: 'Limited time offer on all premium courses',
    isRead: false,
    icon: '/assets/notifications/Circle.svg',
    created: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '3',
    title: "Today's Special Offers",
    message: 'Your payment has been successfully processed',
    isRead: true,
    icon: '/assets/notifications/Circle.svg',
    created: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: '4',
    title: 'Mentor Replied',
    message: 'Your question got a helpful response from the instructor',
    isRead: false,
    icon: '/assets/notifications/Circle.svg',
    created: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: '5',
    title: 'Credit Card Connected',
    message: 'Your payment method has been successfully linked',
    isRead: true,
    icon: '/assets/notifications/Circle.svg',
    created: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

// Fetch all notifications for current user
export async function fetchNotifications(options = {}) {
  if (isDevMode()) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      items: DEMO_NOTIFICATIONS.slice(start, end),
      totalPages: Math.ceil(DEMO_NOTIFICATIONS.length / limit),
      totalItems: DEMO_NOTIFICATIONS.length,
    };
  }

  try {
    const response = await getPb().collection('notifications').getList(
      options.page || 1,
      options.limit || 50,
      {
        sort: '-created',
        filter: options.filter || '',
        ...options.query,
      },
    );

    return {
      items: response.items || [],
      totalPages: response.totalPages,
      totalItems: response.totalItems,
    };
  } catch (error) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      items: DEMO_NOTIFICATIONS.slice(start, end),
      totalPages: Math.ceil(DEMO_NOTIFICATIONS.length / limit),
      totalItems: DEMO_NOTIFICATIONS.length,
    };
  }
}

// Get unread notification count
export async function getUnreadCount() {
  if (isDevMode()) {
    return DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length;
  }

  try {
    const response = await getPb().collection('notifications').getFullList({
      filter: 'isRead = false',
      fields: 'id',
    });
    return response.length;
  } catch {
    return DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length;
  }
}

// Mark notification as read
export async function markAsRead(notificationId) {
  if (isDevMode()) {
    const notif = DEMO_NOTIFICATIONS.find((n) => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
    }
    return notif;
  }

  try {
    const notification = await getPb()
      .collection('notifications')
      .update(notificationId, { isRead: true });
    return notification;
  } catch {
    const notif = DEMO_NOTIFICATIONS.find((n) => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
    }
    return notif;
  }
}

// Mark all notifications as read
export async function markAllAsRead() {
  if (isDevMode()) {
    DEMO_NOTIFICATIONS.forEach((n) => {
      n.isRead = true;
    });
    return true;
  }

  try {
    const notifications = await getPb().collection('notifications').getFullList({
      filter: 'isRead = false',
    });

    const updatePromises = notifications.map((notif) =>
      getPb().collection('notifications').update(notif.id, { isRead: true }),
    );

    await Promise.all(updatePromises);
    return true;
  } catch {
    DEMO_NOTIFICATIONS.forEach((n) => {
      n.isRead = true;
    });
    return true;
  }
}

// Delete notification
export async function deleteNotification(notificationId) {
  if (isDevMode()) {
    const index = DEMO_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
    if (index > -1) {
      DEMO_NOTIFICATIONS.splice(index, 1);
    }
    return true;
  }

  try {
    await getPb().collection('notifications').delete(notificationId);
    return true;
  } catch {
    const index = DEMO_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
    if (index > -1) {
      DEMO_NOTIFICATIONS.splice(index, 1);
    }
    return true;
  }
}

// Subscribe to real-time updates
export function subscribeToNotifications(callback) {
  if (isDevMode()) {
    return () => {};
  }

  try {
    const unsubscribe = getPb().collection('notifications').subscribe('*', (e) => {
      callback(e);
    });
    return unsubscribe;
  } catch {
    return () => {};
  }
}
