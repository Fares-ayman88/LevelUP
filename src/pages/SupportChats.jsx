import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import {
  SUPPORT_ADMIN_EMAIL,
  SUPPORT_ADMIN_NAME,
  ensureChatForUser,
  ensureSignedIn,
  formatSummaryTime,
  subscribeAdminChats,
  subscribeAdmins,
  subscribeUserChats,
} from '../services/supportChatService.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

const BackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <circle cx="6" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="18" cy="12" r="2" fill="currentColor" />
  </svg>
);

function defaultAdmins() {
  return [
    {
      id: 'sa3doon',
      name: 'Sa3doon',
      email: 'sa3doon@levelup.admin',
      avatarUrl: '',
      isActive: true,
    },
    {
      id: 'fares',
      name: 'Fares',
      email: 'fares@levelup.admin',
      avatarUrl: '',
      isActive: true,
    },
    {
      id: 'mahmoud',
      name: 'Mahmoud',
      email: 'mahmoud@levelup.admin',
      avatarUrl: '',
      isActive: true,
    },
  ];
}

function findAdminSummary(admin, chats) {
  const byId = chats.find((item) => item.adminId && item.adminId === admin.id);
  if (byId) return byId;
  const emailKey = `${admin.email || ''}`.trim().toLowerCase();
  if (emailKey) {
    const byEmail = chats.find((item) => `${item.adminEmail || ''}`.trim().toLowerCase() === emailKey);
    if (byEmail) return byEmail;
  }
  const nameKey = `${admin.name || ''}`.trim().toLowerCase();
  if (!nameKey) return null;
  return chats.find((item) => `${item.adminName || ''}`.trim().toLowerCase() === nameKey) || null;
}

function buildUserViewRecent(chats, admins) {
  const adminByEmail = new Map((admins || []).map((admin) => [admin.email.trim().toLowerCase(), admin]));
  const adminByName = new Map((admins || []).map((admin) => [admin.name.trim().toLowerCase(), admin]));
  return (chats || []).map((summary) => {
    const fallbackName = `${summary.adminName || ''}`.trim() || SUPPORT_ADMIN_NAME;
    const admin =
      adminByEmail.get(`${summary.adminEmail || ''}`.trim().toLowerCase()) ||
      adminByName.get(fallbackName.toLowerCase()) ||
      null;

    return {
      chatId: summary.chatId,
      name: fallbackName,
      role: `${summary.adminEmail || ''}`.trim() || 'Admin Support',
      message: summary.lastMessage || 'Tap to start support chat',
      time: formatSummaryTime(summary.lastMessageAt),
      unread: summary.unreadForUser || 0,
      active: summary.activeForAdmin || false,
      lastFromMe: (summary.lastMessageSender || '') === 'user',
      seenByOther:
        Boolean(summary.lastMessageAt) &&
        Boolean(summary.lastReadByAdminAt) &&
        new Date(summary.lastMessageAt).getTime() <= new Date(summary.lastReadByAdminAt).getTime(),
      adminId: summary.adminId || admin?.id || '',
      adminEmail: summary.adminEmail || admin?.email || '',
      adminAvatarUrl: admin?.avatarUrl || '',
    };
  });
}

function buildAdminViewRecent(chats) {
  return (chats || []).map((summary) => ({
    chatId: summary.chatId,
    name: summary.userName || 'User',
    role: summary.userEmail || 'Unknown email',
    message: summary.lastMessage || 'Tap to start support chat',
    time: formatSummaryTime(summary.lastMessageAt),
    unread: summary.unreadForAdmin || 0,
    active: summary.activeForUser || false,
    lastFromMe: (summary.lastMessageSender || '') === 'admin',
    seenByOther:
      Boolean(summary.lastMessageAt) &&
      Boolean(summary.lastReadByUserAt) &&
      new Date(summary.lastMessageAt).getTime() <= new Date(summary.lastReadByUserAt).getTime(),
    userName: summary.userName || '',
    userEmail: summary.userEmail || '',
    adminId: summary.adminId || '',
    adminEmail: summary.adminEmail || '',
    adminAvatarUrl: '',
  }));
}

export default function SupportChats() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const isAdmin = resolveAuthRole(profile, user) === 'admin';
  const [activeUser, setActiveUser] = useState(user || null);
  const [admins, setAdmins] = useState(defaultAdmins());
  const [chats, setChats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      setActiveUser(user || null);
      return () => {};
    }

    let disposed = false;
    (async () => {
      const ensured = await ensureSignedIn();
      if (disposed) return;
      if (!ensured) {
        setError('Sign in to start a support chat');
        return;
      }
      setActiveUser(ensured);
      try {
        await ensureChatForUser(ensured);
      } catch (err) {
        if (disposed) return;
        setError(`${err?.message || err || 'Support chat is unavailable right now.'}`);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [isAdmin, user]);

  useEffect(() => {
    const unsubscribe = subscribeAdmins(
      (items) => setAdmins(items?.length ? items : defaultAdmins()),
      () => {}
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const uid = `${activeUser?.uid || ''}`.trim();
    if (!isAdmin && !uid) {
      setChats([]);
      return () => {};
    }
    const unsubscribe = isAdmin
      ? subscribeAdminChats((items) => setChats(items || []), () => {})
      : subscribeUserChats(uid, (items) => setChats(items || []), () => {});
    return unsubscribe;
  }, [activeUser?.uid, isAdmin]);

  const adminTeam = useMemo(() => {
    return (admins || []).map((admin) => {
      const summary = findAdminSummary(admin, chats);
      const message = summary?.lastMessage || 'Tap to start support chat';
      return {
        id: admin.id,
        name: admin.name || SUPPORT_ADMIN_NAME,
        role: admin.email || 'Admin Support',
        message,
        time: formatSummaryTime(summary?.lastMessageAt),
        unread: summary?.unreadForUser || 0,
        active: summary?.activeForAdmin || admin.isActive || false,
        chatId: summary?.chatId || activeUser?.uid || '',
        adminId: admin.id,
        adminEmail: admin.email,
        adminAvatarUrl: admin.avatarUrl || '',
      };
    });
  }, [activeUser?.uid, admins, chats]);

  const recent = useMemo(() => {
    return isAdmin ? buildAdminViewRecent(chats) : buildUserViewRecent(chats, admins);
  }, [admins, chats, isAdmin]);

  const openThreadForAdminTile = (tile) => {
    navigate('/support-chat-thread', {
      state: {
        chatId: tile.chatId || activeUser?.uid || '',
        userName: '',
        userEmail: '',
        adminId: tile.adminId || '',
        adminName: tile.name || SUPPORT_ADMIN_NAME,
        adminEmail: tile.adminEmail || SUPPORT_ADMIN_EMAIL,
        adminAvatarUrl: tile.adminAvatarUrl || '',
      },
    });
  };

  const openThreadForRecent = (item) => {
    navigate('/support-chat-thread', {
      state: {
        chatId: item.chatId,
        userName: item.userName || '',
        userEmail: item.userEmail || '',
        adminId: item.adminId || '',
        adminName: isAdmin ? '' : item.name,
        adminEmail: item.adminEmail || '',
        adminAvatarUrl: item.adminAvatarUrl || '',
      },
    });
  };

  return (
    <div className="chats-page">
      <div className="screen screen--narrow">
        <div className="chats-header">
          <button
            type="button"
            className="chats-icon"
            onClick={() => navigate('/home')}
          >
            <BackIcon />
          </button>
          <h2>{isAdmin ? 'User Support' : 'Admin Support'}</h2>
          <button type="button" className="chats-icon">
            <MoreIcon />
          </button>
        </div>
        <div className="chats-tabs">
          <button type="button" className="chats-tab" onClick={() => navigate('/indox')}>
            Indox
          </button>
          <button type="button" className="chats-tab" onClick={() => navigate('/mentor-chats')}>
            Mentor Chats
          </button>
          <button type="button" className="chats-tab active">
            {isAdmin ? 'User Support' : 'Admin Support'}
          </button>
        </div>
        {error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : null}
        <div className="chats-section">
          <h3>Admin Team</h3>
          {adminTeam.map((tile) => (
            <button
              key={`admin-${tile.id}`}
              type="button"
              className="chat-tile"
              onClick={() => openThreadForAdminTile(tile)}
            >
              <div className="chat-avatar">
                {(tile.name || 'A').slice(0, 1)}
                {tile.active ? <span className="chat-dot" /> : null}
              </div>
              <div className="chat-body">
                <div className="chat-row">
                  <strong>{tile.name}</strong>
                  <span className={`chat-time ${tile.unread ? 'active' : ''}`}>
                    {tile.time || 'Now'}
                  </span>
                </div>
                <div className="chat-row chat-row--sub">
                  <span className="chat-message">{tile.message}</span>
                  {tile.unread ? (
                    <span className="chat-unread">{tile.unread}</span>
                  ) : null}
                </div>
                <span className="chat-role">{tile.role}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="chats-section">
          <h3>Recent</h3>
          {recent.map((item) => (
            <button
              key={`recent-${item.chatId}-${item.name}`}
              type="button"
              className="chat-tile"
              onClick={() => openThreadForRecent(item)}
            >
              <div className="chat-avatar">
                {(item.name || 'U').slice(0, 1)}
                {item.active ? <span className="chat-dot" /> : null}
              </div>
              <div className="chat-body">
                <div className="chat-row">
                  <strong>{item.name}</strong>
                  <span className={`chat-time ${item.unread ? 'active' : ''}`}>
                    {item.time || 'Now'}
                  </span>
                </div>
                <div className="chat-row chat-row--sub">
                  <span className="chat-message">{item.message}</span>
                  {item.unread ? (
                    <span className="chat-unread">{item.unread}</span>
                  ) : null}
                </div>
                <span className="chat-role">{item.role}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <MainBottomNav currentIndex={2} />
    </div>
  );
}
