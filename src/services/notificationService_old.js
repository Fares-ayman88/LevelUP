import pb from './pocketbase.js';

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
  try {
    // Try to fetch from API first
    const response = await pb.collection('notifications').getList(
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
    console.warn('Error fetching notifications from API:', error.message);
    
    // Fall back to demo data on error
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
  try {
    const isDevMode = import.meta.env.DEV || !pb.authStore.isValid;
    
    if (isDevMode) {
      return DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length;
    }

    const response = await pb.collection('notifications').getFullList({
      filter: 'isRead = false',
      fields: 'id',
    });
    return response.length;
  } catch (error) {
    console.warn('Error getting unread count, using demo data:', error.message);
    return DEMO_NOTIFICATIONS.filter((n) => !n.isRead).length;
  }
}

// Mark notification as read
export async function markAsRead(notificationId) {
  try {
    const isDevMode = import.meta.env.DEV || !pb.authStore.isValid;
    
    if (isDevMode) {
      // Update demo data in memory
      const notif = DEMO_NOTIFICATIONS.find((n) => n.id === notificationId);
      if (notif) {
        notif.isRead = true;
      }
      return notif;
    }

    const notification = await pb
      .collection('notifications')
      .update(notificationId, { isRead: true });
    return notification;
  } catch (error) {
    console.warn('Error marking notification as read:', error.message);
    // Update demo data as fallback
    const notif = DEMO_NOTIFICATIONS.find((n) => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
    }
    return notif;
  }
}

// Mark all notifications as read
export async function markAllAsRead() {
  try {
    const isDevMode = import.meta.env.DEV || !pb.authStore.isValid;
    
    if (isDevMode) {
      DEMO_NOTIFICATIONS.forEach((n) => {
        n.isRead = true;
      });
      return true;
    }

    const notifications = await pb.collection('notifications').getFullList({
      filter: 'isRead = false',
    });

    const updatePromises = notifications.map((notif) =>
      pb.collection('notifications').update(notif.id, { isRead: true }),
    );

    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.warn('Error marking all as read:', error.message);
    // Update demo data as fallback
    DEMO_NOTIFICATIONS.forEach((n) => {
      n.isRead = true;
    });
    return true;
  }
}

// Delete notification
export async function deleteNotification(notificationId) {
  try {
    const isDevMode = import.meta.env.DEV || !pb.authStore.isValid;
    
    if (isDevMode) {
      const index = DEMO_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
      if (index > -1) {
        DEMO_NOTIFICATIONS.splice(index, 1);
      }
      return true;
    }

    await pb.collection('notifications').delete(notificationId);
    return true;
  } catch (error) {
    console.warn('Error deleting notification:', error.message);
    // Remove from demo data as fallback
    const index = DEMO_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
    if (index > -1) {
      DEMO_NOTIFICATIONS.splice(index, 1);
    }
    return true;
  }
}

// Subscribe to real-time updates
export function subscribeToNotifications(callback) {
  try {
    const isDevMode = import.meta.env.DEV || !pb.authStore.isValid;
    
    if (isDevMode) {
      // In demo mode, set up a mock subscription
      console.log('Demo mode: Real-time subscriptions simulated');
      return () => {
        // Return unsubscribe function
        console.log('Demo mode: Unsubscribed from notifications');
      };
    }

    const unsubscribe = pb.collection('notifications').subscribe('*', (e) => {
      callback(e);
    });
    return unsubscribe;
  } catch (error) {
    console.warn('Error subscribing to notifications:', error.message);
    // Return a no-op unsubscribe function
    return () => {
      console.log('Subscription cleanup (error state)');
    };
  }
}
