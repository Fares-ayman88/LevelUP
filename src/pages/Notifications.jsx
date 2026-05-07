import { useNavigate } from 'react-router-dom';
import { useMemo, useState, memo } from 'react';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { useNotifications } from '../hooks/useNotifications.js';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import SkeletonNotification from '../components/SkeletonNotification.jsx';
import NotificationCard from '../components/NotificationCard.jsx';

// Helper: Format date
function formatTimeAgo(date) {
  if (!date) return 'Just now';
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

// Helper: Group notifications by date
function groupNotificationsByDate(notifications) {
  const groups = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  notifications.forEach((notif) => {
    const date = new Date(notif.created);
    date.setHours(0, 0, 0, 0);

    let groupKey = 'Later';
    const diffTime = today - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) groupKey = 'Today';
    else if (diffDays === 1) groupKey = 'Yesterday';
    else groupKey = date.toLocaleDateString();

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notif);
  });

  return Object.entries(groups).map(([title, items]) => ({
    title,
    items: items.sort((a, b) => new Date(b.created) - new Date(a.created)),
  }));
}

function Notifications() {
  const navigate = useNavigate();
  const [loadingIds, setLoadingIds] = useState(new Set());
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const sections = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications],
  );

  const markAsReadHandler = async (notificationId) => {
    try {
      setLoadingIds((prev) => new Set([...prev, notificationId]));
      await markAsRead(notificationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    } finally {
      setLoadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const deleteNotificationHandler = async (notificationId) => {
    try {
      setLoadingIds((prev) => new Set([...prev, notificationId]));
      await deleteNotification(notificationId);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setLoadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsReadHandler = async () => {
    try {
      setLoadingIds((prev) => new Set([...prev, 'mark-all']));
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete('mark-all');
        return newSet;
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <div className="screen screen--wide">
          <div className="page-header">
            <button
              type="button"
              className="icon-btn"
              onClick={() => navigate(-1)}
              title="Go back"
            >
              <span className="material-icons-round icon-btn__arrow" aria-hidden>
                arrow_back
              </span>
            </button>
            <div>
              <h2>Notifications</h2>
              {unreadCount > 0 && (
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7d818f' }}>
                  {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#ffe9e9',
                border: '1px solid #e74c3c',
                color: '#c0392b',
                marginBottom: '16px',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div className="notification-settings-link">
              <button 
                type="button" 
                onClick={() => navigate('/notification-settings')}
                aria-label="Open notification settings"
              >
                Notification Settings
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsReadHandler}
                disabled={loadingIds.has('mark-all')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: loadingIds.has('mark-all') ? '#ccc' : '#0d65ff',
                  fontWeight: '700',
                  cursor: loadingIds.has('mark-all') ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: loadingIds.has('mark-all') ? 0.6 : 1,
                }}
                title={loadingIds.has('mark-all') ? 'Processing...' : 'Mark all as read'}
                aria-label={`Mark all ${unreadCount} notifications as read`}
                aria-busy={loadingIds.has('mark-all')}
              >
                {loadingIds.has('mark-all') ? (
                  <div className="loading-dots">
                    <div className="loading-dot" />
                    <div className="loading-dot" />
                    <div className="loading-dot" />
                  </div>
                ) : (
                  <>
                    <DoneAllRoundedIcon style={{ fontSize: '18px' }} />
                    Mark all read
                  </>
                )}
              </button>
            )}
          </div>

          {isLoading ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '16px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ width: '150px', height: '20px', background: '#e0e0e0', borderRadius: '4px', animation: 'shimmer 2s infinite' }} />
              </div>
              <h3
                style={{
                  margin: '16px 0 12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#7d818f',
                }}
              >
                Today
              </h3>
              {[1, 2, 3].map((i) => (
                <SkeletonNotification key={i} />
              ))}
            </div>
          ) : !isLoading && notifications.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#7d818f',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <h3 style={{ margin: '0 0 8px', color: '#202244', fontSize: '18px' }}>
                No Notifications
              </h3>
              <p style={{ margin: 0, fontSize: '13px' }}>
                You're all caught up! Check back later for updates.
              </p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.title} className="notification-section">
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#7d818f',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {section.title}
                </h3>
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className="notification-card"
                    style={{
                      opacity: !item.isRead ? 1 : 0.7,
                      background: !item.isRead ? '#eff4ff' : '#f8f9fc',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = !item.isRead ? '#e6ecff' : '#eef2f9';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(124, 139, 180, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = !item.isRead ? '#eff4ff' : '#f8f9fc';
                      e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
                    }}
                  >
                    <div className="notification-icon">
                      <img src={item.icon || '/assets/notifications/Circle.svg'} alt={item.title} loading="lazy" />
                    </div>
                    <div className="notification-body">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#9aa1b8',
                          marginTop: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {formatTimeAgo(item.created)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        marginLeft: 'auto',
                      }}
                    >
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={() => markAsReadHandler(item.id)}
                          disabled={loadingIds.has(item.id)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            background: loadingIds.has(item.id) ? '#f0f0f0' : '#e6f2ff',
                            color: loadingIds.has(item.id) ? '#ccc' : '#0d65ff',
                            cursor: loadingIds.has(item.id) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            opacity: loadingIds.has(item.id) ? 0.6 : 1,
                          }}
                          title={loadingIds.has(item.id) ? 'Processing...' : 'Mark as read'}
                        >
                          {loadingIds.has(item.id) ? (
                            <span style={{ fontSize: '12px', animation: 'spin 1s linear infinite' }}>⟳</span>
                          ) : (
                            <span className="material-icons-round" style={{ fontSize: '18px' }}>
                              done
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteNotificationHandler(item.id)}
                        disabled={loadingIds.has(item.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: 'none',
                          background: loadingIds.has(item.id) ? '#f0f0f0' : '#f0f0f0',
                          color: loadingIds.has(item.id) ? '#ccc' : '#7d818f',
                          cursor: loadingIds.has(item.id) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          opacity: loadingIds.has(item.id) ? 0.6 : 1,
                        }}
                        title={loadingIds.has(item.id) ? 'Deleting...' : 'Delete notification'}
                      >
                        {loadingIds.has(item.id) ? (
                          <span style={{ fontSize: '12px', animation: 'spin 1s linear infinite' }}>⟳</span>
                        ) : (
                          <DeleteOutlineRoundedIcon style={{ fontSize: '18px' }} />
                        )}
                      </button>
                    </div>

                    {!item.isRead && (
                      <span
                        className="notification-dot"
                        style={{
                          animation: 'pulse 2s infinite',
                        }}
                        title="New notification"
                      />
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(0.85);
            }
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .notification-card {
            position: relative;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px;
            border-radius: 18px;
            border: 1px solid #dce6f7;
            box-shadow: var(--shadow-soft);
            margin-bottom: 14px;
            cursor: pointer;
          }

          .notification-icon img {
            width: 52px;
            height: 52px;
          }

          .notification-body {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
            min-width: 0;
          }

          .notification-body strong {
            font-size: 15px;
            color: #202244;
            line-height: 1.3;
          }

          .notification-body span {
            font-size: 13px;
            color: #7d818f;
            font-weight: 600;
            line-height: 1.4;
          }

          .notification-dot {
            position: absolute;
            right: 14px;
            top: 12px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #0d65ff;
            box-shadow: 0 2px 8px rgba(13, 101, 255, 0.4);
          }

          .notification-section {
            margin-top: 24px;
          }

          .notification-section h3 {
            margin: 0 0 12px;
            font-size: 14px;
            color: #7d818f;
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}

export default memo(Notifications);

Notifications.displayName = 'Notifications';
