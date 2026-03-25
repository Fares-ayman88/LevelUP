import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ChatThread from '../components/ChatThread.jsx';
import {
  buildConversationId,
  ensureConversation,
  formatMessageTime,
  markReadForUser,
  sendUserText,
  subscribeConversationSummary,
  subscribeMessages,
} from '../services/mentorChatService.js';
import { useAuth } from '../state/auth.jsx';

function fallbackMentorId(name = '') {
  const normalized = name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return normalized || 'mentor';
}

function mapMessages(messages, mentorName) {
  if (!messages.length) {
    return [
      {
        id: 'welcome',
        from: 'assistant',
        text: `Hi, I am ${mentorName}. How can I help you?`,
      },
    ];
  }
  return messages.map((message) => ({
    id: message.id,
    from: message.senderRole === 'user' ? 'user' : 'assistant',
    type: 'text',
    text: message.text,
    time: formatMessageTime(message.createdAt),
  }));
}

export default function MentorChatThread() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState(null);

  const mentorName = `${location.state?.name || 'Mentor'}`.trim() || 'Mentor';
  const mentorRole = `${location.state?.role || 'Mentor'}`.trim() || 'Mentor';
  const mentorId = `${location.state?.mentorId || fallbackMentorId(mentorName)}`.trim();
  const mentorImagePath = `${location.state?.imagePath || ''}`.trim();

  const conversationId = useMemo(() => {
    if (!user?.uid || !mentorId) return '';
    return buildConversationId({
      userId: user.uid,
      mentorId,
    });
  }, [mentorId, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !conversationId) {
      setLoading(false);
      if (!user?.uid) {
        setError('Sign in to open mentor chat.');
      }
      return () => {};
    }

    let disposed = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        await ensureConversation({
          conversationId,
          userId: user.uid,
          mentorId,
          mentorName,
          mentorRole,
          mentorImagePath,
        });
        await markReadForUser(conversationId);
      } catch (err) {
        if (disposed) return;
        setError(`${err?.message || err || 'Failed to open mentor chat.'}`);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    const unSubMessages = subscribeMessages(
      conversationId,
      (items) => {
        if (disposed) return;
        setMessages(items || []);
      },
      () => {}
    );

    const unSubSummary = subscribeConversationSummary(
      conversationId,
      (item) => {
        if (disposed) return;
        setSummary(item || null);
      },
      () => {}
    );

    return () => {
      disposed = true;
      unSubMessages();
      unSubSummary();
    };
  }, [
    conversationId,
    mentorId,
    mentorImagePath,
    mentorName,
    mentorRole,
    user?.uid,
  ]);

  const uiMessages = useMemo(
    () => mapMessages(messages, mentorName),
    [messages, mentorName]
  );

  const handleSendText = async (text) => {
    if (!user?.uid || !conversationId) return;
    setSending(true);
    try {
      await sendUserText({
        conversationId,
        userId: user.uid,
        mentorId,
        mentorName,
        mentorRole,
        mentorImagePath,
        text,
      });
      await markReadForUser(conversationId);
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

  if (error) {
    return (
      <div className="app-shell">
        <div className="screen screen--wide empty-state">
          <p>{error}</p>
          <button type="button" className="primary-pill" onClick={() => navigate('/mentor-chats')}>
            <span>Back</span>
            <span className="primary-pill__arrow">&gt;</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatThread
      title={mentorName}
      subtitle={mentorRole}
      onBack={() => navigate('/mentor-chats')}
      onCall={() => navigate('/call', { state: { name: mentorName } })}
      messages={uiMessages}
      onSendText={handleSendText}
      sending={sending}
      composerHint="Type a message..."
      showAttachmentButton={false}
      showSearch={false}
      showMenu={false}
      avatarText={mentorName}
      showCall
      showVideo={false}
      statusOnline={summary?.activeForMentor}
    />
  );
}

