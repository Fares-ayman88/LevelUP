import levelupApi from './levelupApi.js';

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
];

function mapNotification(item = {}) {
  return {
    ...item,
    isRead: item.isRead === true || item.isRead === 1,
    created: item.created || item.createdAt || new Date().toISOString(),
  };
}

export async function fetchNotifications(options = {}) {
  if (!levelupApi.token) {
    return {
      items: [],
      totalPages: 1,
      totalItems: 0,
    };
  }
  try {
    const response = await levelupApi.notifications.list();
    const all = (response.items || []).map(mapNotification);
    const page = options.page || 1;
    const limit = options.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit;
    return {
      items: all.slice(start, end),
      totalPages: Math.max(1, Math.ceil(all.length / limit)),
      totalItems: all.length,
    };
  } catch (error) {
    if (error?.status === 401) {
      levelupApi.clearToken();
      return {
        items: [],
        totalPages: 1,
        totalItems: 0,
      };
    }
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

export async function getUnreadCount() {
  const response = await fetchNotifications({ page: 1, limit: 200 });
  return response.items.filter((n) => !n.isRead).length;
}

export async function markAsRead(notificationId) {
  if (!levelupApi.token) return null;
  try {
    const response = await levelupApi.notifications.markRead(notificationId);
    return mapNotification(response.item);
  } catch {
    const notif = DEMO_NOTIFICATIONS.find((n) => n.id === notificationId);
    if (notif) notif.isRead = true;
    return notif;
  }
}

export async function markAllAsRead() {
  const response = await fetchNotifications({ page: 1, limit: 200 });
  await Promise.all(response.items.filter((n) => !n.isRead).map((n) => markAsRead(n.id)));
  return true;
}

export async function deleteNotification(notificationId) {
  if (!levelupApi.token) return true;
  try {
    await levelupApi.notifications.remove(notificationId);
    return true;
  } catch {
    const index = DEMO_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
    if (index > -1) DEMO_NOTIFICATIONS.splice(index, 1);
    return true;
  }
}

export function subscribeToNotifications(callback) {
  if (!levelupApi.token) return () => {};
  let closed = false;
  let timer = null;
  const emit = async () => {
    if (closed) return;
    if (!levelupApi.token) {
      closed = true;
      if (timer) clearInterval(timer);
      return;
    }
    const data = await fetchNotifications({ page: 1, limit: 50 });
    callback({ action: 'refresh', items: data.items });
  };
  emit();
  timer = setInterval(emit, 10000);
  return () => {
    closed = true;
    clearInterval(timer);
  };
}
