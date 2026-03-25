import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ChatThread from '../components/ChatThread.jsx';
import {
  SUPPORT_ADMIN_EMAIL,
  SUPPORT_ADMIN_NAME,
  ensureChatForUser,
  ensureSignedIn,
  formatMessageTime,
  markRead,
  sendAttachments,
  sendText,
  setActive,
  subscribeChatSummary,
  subscribeMessages,
} from '../services/supportChatService.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

function mapMessages(messages, isAdminView, summary) {
  return (messages || []).map((message) => {
    const isAssistant = isAdminView
      ? message.senderRole !== 'admin'
      : message.senderRole === 'admin';
    const base = {
      id: message.id,
      from: isAssistant ? 'assistant' : 'user',
      time: formatMessageTime(message.createdAt),
    };

    if (
      message.type === 'images' ||
      (message.type === 'text' &&
        message.attachments.length > 0 &&
        message.attachments.every((item) => item.type === 'image'))
    ) {
      const imagePaths = message.attachments
        .map((attachment) => {
          if (attachment.url) return attachment.url;
          if (attachment.data) {
            const mime = attachment.mime || 'image/jpeg';
            return `data:${mime};base64,${attachment.data}`;
          }
          return '';
        })
        .filter(Boolean);
      return { ...base, type: 'images', imagePaths };
    }

    if (
      message.type === 'files' ||
      (message.type === 'text' && message.attachments.length > 0)
    ) {
      const files = message.attachments.map((attachment) => ({
        name: attachment.name || 'File',
        size: attachment.size || 0,
      }));
      return { ...base, type: 'files', files };
    }

    let isRead = null;
    if (isAdminView && message.senderRole === 'admin') {
      isRead = Boolean(summary?.lastReadByUserAt) &&
        new Date(message.createdAt).getTime() <= new Date(summary.lastReadByUserAt).getTime();
    } else if (!isAdminView && message.senderRole === 'user') {
      isRead = Boolean(summary?.lastReadByAdminAt) &&
        new Date(message.createdAt).getTime() <= new Date(summary.lastReadByAdminAt).getTime();
    }
    return { ...base, type: 'text', text: message.text, isRead };
  });
}

export default function SupportChatThread() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();
  const isAdmin = resolveAuthRole(profile, user) === 'admin';

  const [activeUser, setActiveUser] = useState(user || null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState(null);

  const args = location.state || {};
  const resolvedChatId = useMemo(() => {
    if (isAdmin) return `${args.chatId || ''}`.trim();
    const fromArgs = `${args.chatId || ''}`.trim();
    if (fromArgs) return fromArgs;
    return `${activeUser?.uid || ''}`.trim();
  }, [activeUser?.uid, args.chatId, isAdmin]);

  const title = isAdmin
    ? `${args.userName || ''}`.trim() || 'User'
    : `${args.adminName || ''}`.trim() || SUPPORT_ADMIN_NAME;
  const subtitle = isAdmin ? 'USER SUPPORT' : 'SUPPORT';

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      if (isAdmin) {
        setActiveUser(user || null);
        setLoading(false);
        return;
      }

      const ensured = await ensureSignedIn();
      if (disposed) return;
      if (!ensured) {
        setError('Sign in to start a support chat.');
        setLoading(false);
        return;
      }
      setActiveUser(ensured);
      try {
        await ensureChatForUser(ensured);
      } catch (err) {
        if (!disposed) {
          setError(`${err?.message || err || 'Support chat is unavailable right now.'}`);
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    setLoading(true);
    setError('');
    void run();

    return () => {
      disposed = true;
    };
  }, [isAdmin, user]);

  useEffect(() => {
    if (!resolvedChatId) return () => {};
    const unsubscribeMessages = subscribeMessages(
      resolvedChatId,
      (items) => setMessages(items || []),
      () => {}
    );
    const unsubscribeSummary = subscribeChatSummary(
      resolvedChatId,
      (item) => setSummary(item || null),
      () => {}
    );
    return () => {
      unsubscribeMessages();
      unsubscribeSummary();
    };
  }, [resolvedChatId]);

  useEffect(() => {
    if (!resolvedChatId) return () => {};
    void setActive({ chatId: resolvedChatId, isAdmin, active: true });
    void markRead({ chatId: resolvedChatId, isAdmin });
    return () => {
      void setActive({ chatId: resolvedChatId, isAdmin, active: false });
    };
  }, [isAdmin, resolvedChatId]);

  const uiMessages = useMemo(
    () => mapMessages(messages, isAdmin, summary),
    [isAdmin, messages, summary]
  );

  const handleSendText = async (text) => {
    if (!resolvedChatId || !activeUser) return;
    setSending(true);
    try {
      await sendText({
        chatId: resolvedChatId,
        user: activeUser,
        isAdmin,
        text,
        adminId: isAdmin ? null : args.adminId,
        adminName: isAdmin ? null : args.adminName,
        adminEmail: isAdmin ? null : args.adminEmail || SUPPORT_ADMIN_EMAIL,
      });
      await markRead({ chatId: resolvedChatId, isAdmin });
    } finally {
      setSending(false);
    }
  };

  const handleSendAttachments = async (attachments) => {
    if (!resolvedChatId || !activeUser) return;
    setSending(true);
    try {
      await sendAttachments({
        chatId: resolvedChatId,
        user: activeUser,
        isAdmin,
        attachments,
        adminId: isAdmin ? null : args.adminId,
        adminName: isAdmin ? null : args.adminName,
        adminEmail: isAdmin ? null : args.adminEmail || SUPPORT_ADMIN_EMAIL,
      });
      await markRead({ chatId: resolvedChatId, isAdmin });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="screen screen--wide empty-state">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error || !resolvedChatId) {
    return (
      <div className="app-shell">
        <div className="screen screen--wide empty-state">
          <p>{error || 'Sign in to start a support chat.'}</p>
          <button type="button" className="primary-pill" onClick={() => navigate('/support-chats')}>
            <span>Back</span>
            <span className="primary-pill__arrow">&gt;</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatThread
      title={title}
      subtitle={subtitle}
      onBack={() => navigate('/support-chats')}
      onCall={() => navigate('/call', { state: { name: title } })}
      messages={uiMessages}
      onSendText={handleSendText}
      onSendAttachments={handleSendAttachments}
      sending={sending}
      composerHint="Type a message..."
      showAttachmentButton
      showSearch={false}
      showMenu={false}
      avatarText={title}
      showCall
      showVideo={false}
    />
  );
}
