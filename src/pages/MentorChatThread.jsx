import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import ChatThread from '../components/ChatThread.jsx';
import {
  buildConversationId,
  ensureConversation,
  formatMessageTime,
  markMentorSeen,
  markReadForUser,
  sendText,
  subscribeConversationSummary,
  subscribeMessages,
} from '../services/mentorChatService.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

function fallbackId(name = '') {
  const normalized = name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return normalized || 'unknown';
}

function mapMessages(messages, currentRole) {
  return (messages || []).map((message) => ({
    id: message.id,
    from: message.senderRole === currentRole ? 'user' : 'assistant',
    type: 'text',
    text: message.text,
    time: formatMessageTime(message.createdAt),
  }));
}

export default function MentorChatThread() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();
  const role = resolveAuthRole(profile, user);
  const isInstructor = role === 'instructor';

  const counterpartId = `${location.state?.participantId || location.state?.mentorId || fallbackId(location.state?.participantName || '')}`.trim();
  const participantName = `${location.state?.participantName || location.state?.name || (isInstructor ? 'Student' : 'Mentor')}`.trim();
  const participantRole = `${location.state?.participantRole || location.state?.role || (isInstructor ? 'Student' : 'Mentor')}`.trim();
  const participantImagePath = `${location.state?.participantImagePath || location.state?.imagePath || ''}`.trim();

  const mentorId = isInstructor ? user?.uid || '' : counterpartId;
  const userId = isInstructor ? counterpartId : user?.uid || '';
  const mentorName = isInstructor ? `${profile?.name || user?.displayName || 'Instructor'}`.trim() : participantName;
  const mentorRole = isInstructor ? 'Instructor' : participantRole;
  const mentorImagePath = isInstructor ? `${profile?.photoUrl || ''}`.trim() : participantImagePath;
  const userName = isInstructor ? participantName : `${profile?.name || user?.displayName || 'Student'}`.trim();
  const userImagePath = isInstructor ? participantImagePath : `${profile?.photoUrl || ''}`.trim();

  const conversationId = useMemo(() => {
    if (!user?.uid || !counterpartId) return '';
    if (location.state?.conversationId) return `${location.state.conversationId}`.trim();
    return buildConversationId({
      userId: isInstructor ? counterpartId : user.uid,
      mentorId: isInstructor ? user.uid : counterpartId,
    });
  }, [counterpartId, isInstructor, location.state?.conversationId, user?.uid]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!user?.uid || !conversationId) {
      setLoading(false);
      if (!user?.uid) {
        setError('Sign in to open chat.');
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
          userId,
          mentorId,
          mentorName,
          mentorRole,
          mentorImagePath,
          userName,
          userImagePath,
        });

        if (isInstructor) {
          await markMentorSeen(conversationId);
        } else {
          await markReadForUser(conversationId);
        }
      } catch (err) {
        if (disposed) return;
        setError(`${err?.message || err || 'Failed to open chat.'}`);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    const unsubMessages = subscribeMessages(
      conversationId,
      (items) => {
        if (disposed) return;
        setMessages(items || []);
      },
      () => {}
    );

    const unsubSummary = subscribeConversationSummary(
      conversationId,
      (item) => {
        if (disposed) return;
        setSummary(item || null);
      },
      () => {}
    );

    return () => {
      disposed = true;
      unsubMessages();
      unsubSummary();
    };
  }, [conversationId, isInstructor, mentorId, mentorImagePath, mentorName, mentorRole, userId, user?.uid, userImagePath, userName]);

  const uiMessages = useMemo(
    () => mapMessages(messages, isInstructor ? 'mentor' : 'user'),
    [messages, isInstructor]
  );

  const handleSendText = async (text) => {
    if (!conversationId || !user?.uid) return;
    setSending(true);
    try {
      await sendText({
        conversationId,
        userId,
        mentorId,
        mentorName,
        mentorRole,
        mentorImagePath,
        userName,
        userImagePath,
        senderRole: isInstructor ? 'mentor' : 'user',
        text,
      });
      if (!isInstructor) {
        await markReadForUser(conversationId);
      }
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
      title={participantName}
      subtitle={participantRole}
      onBack={() => navigate('/mentor-chats')}
      onCall={() => navigate('/call', { state: { name: participantName } })}
      messages={uiMessages}
      onSendText={handleSendText}
      sending={sending}
      composerHint="Type a message..."
      showAttachmentButton={false}
      showSearch={false}
      showMenu={false}
      avatarText={participantName}
      showCall
      showVideo={false}
      statusOnline={Boolean(summary?.activeForMentor && !isInstructor)}
    />
  );
}

