import React, { memo } from 'react';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

// Memoized notification card component for performance
const NotificationCard = memo(({
  item,
  onMarkAsRead,
  onDelete,
  isLoading,
  formatTimeAgo,
}) => {
  return (
    <div
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
            onClick={() => onMarkAsRead(item.id)}
            disabled={isLoading}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: isLoading ? '#f0f0f0' : '#e6f2ff',
              color: isLoading ? '#ccc' : '#0d65ff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: isLoading ? 0.6 : 1,
            }}
            title={isLoading ? 'Processing...' : 'Mark as read'}
          >
            {isLoading ? (
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
          onClick={() => onDelete(item.id)}
          disabled={isLoading}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: isLoading ? '#f0f0f0' : '#f0f0f0',
            color: isLoading ? '#ccc' : '#7d818f',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: isLoading ? 0.6 : 1,
          }}
          title={isLoading ? 'Deleting...' : 'Delete notification'}
        >
          {isLoading ? (
            <span style={{ fontSize: '12px', animation: 'spin 1s linear infinite' }}>⟳</span>
          ) : (
            <DeleteOutlineRoundedIcon style={{ fontSize: '18px' }} />
          )}
        </button>
      </div>
    </div>
  );
});

NotificationCard.displayName = 'NotificationCard';

export default NotificationCard;
