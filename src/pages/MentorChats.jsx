import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import { fetchMentors } from '../services/homeData.js';
import {
  buildConversationId,
  formatSummaryTime,
  subscribeParticipantChats,
} from '../services/mentorChatService.js';
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

const ChatCheck = ({ seen }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className={`chat-check-icon ${seen ? 'seen' : ''}`}
  >
    {seen ? (
      <>
        <path
          d="M5 12l4 4 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 12l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <path
        d="M6 12l4 4 8-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

function buildChatList(mentors, summaries, role) {
  if (role === 'instructor') {
    return (summaries || []).map((summary) => ({
      id: summary.userId || summary.conversationId,
      conversationId: summary.conversationId,
      name: summary.userName || summary.mentorName || 'Student',
      role: summary.userName ? 'Student' : 'Student',
      imagePath: summary.userImagePath || summary.mentorImagePath || '',
      message: summary.lastMessage || 'Tap to continue the conversation',
      time: summary.lastMessageAt ? formatSummaryTime(summary.lastMessageAt) : '',
      unread: summary.lastMessageFromUser && !summary.lastSeenByMentor ? 1 : 0,
      active: summary.activeForMentor || false,
      lastFromUser: summary.lastMessageFromUser || false,
      seen: summary.lastSeenByMentor ?? true,
      hasRealChat: Boolean(summary.lastMessage?.trim()),
      userId: summary.userId,
      mentorId: summary.mentorId,
    }));
  }

  const summaryMap = new Map((summaries || []).map((item) => [item.mentorId, item]));
  return (mentors || []).map((mentor) => {
    const summary = summaryMap.get(mentor.id) || null;
    return {
      id: mentor.id,
      conversationId: summary?.conversationId || '',
      name: mentor.name,
      role: mentor.subtitle || `${mentor.category} Mentor`,
      imagePath: summary?.mentorImagePath || mentor.imagePath || '',
      message: summary?.lastMessage || 'Tap to start chat',
      time: summary?.lastMessageAt ? formatSummaryTime(summary.lastMessageAt) : '',
      unread: summary?.unreadForUser || 0,
      active: summary?.activeForMentor || false,
      lastFromUser: summary?.lastMessageFromUser || false,
      seen: summary ? summary.lastSeenByMentor : true,
      hasRealChat: Boolean(summary?.lastMessage?.trim()),
      mentorId: mentor.id,
    };
  });
}

export default function MentorChats() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const role = resolveAuthRole(profile, user);
  const [mentors, setMentors] = useState([]);
  const [summaries, setSummaries] = useState([]);

  useEffect(() => {
    fetchMentors().then(setMentors).catch(() => setMentors([]));
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setSummaries([]);
      return () => {};
    }

    const unsubscribe = subscribeParticipantChats(
      user.uid,
      role,
      (items) => setSummaries(items || []),
      () => {}
    );

    return unsubscribe;
  }, [role, user?.uid]);

  const chats = useMemo(() => buildChatList(mentors, summaries, role), [mentors, summaries, role]);
  const recentChats = useMemo(
    () => chats.filter((item) => item.hasRealChat && item.time),
    [chats]
  );

  const openThread = (chat) => {
    const conversationId = chat.conversationId || buildConversationId({
      userId: user.uid,
      mentorId: chat.mentorId || chat.id,
    });

    navigate('/mentor-chat-thread', {
      state: {
        conversationId,
        participantId: chat.id,
        participantName: chat.name,
        participantRole: chat.role,
        participantImagePath: chat.imagePath,
        mentorId: role === 'instructor' ? user.uid : chat.id,
        userName: role === 'instructor' ? chat.name : undefined,
      },
    });
  };

  const headerTitle = role === 'instructor' ? 'Student Conversations' : 'Mentor Chats';
  const sectionTitle = role === 'instructor' ? 'Students' : 'Mentors';

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
          <h2>{headerTitle}</h2>
          <button type="button" className="chats-icon">
            <MoreIcon />
          </button>
        </div>
        <div className="chats-tabs">
          <button type="button" className="chats-tab" onClick={() => navigate('/indox')}>
            Indox
          </button>
          <button type="button" className="chats-tab active">{headerTitle}</button>
          <button type="button" className="chats-tab" onClick={() => navigate('/support-chats')}>
            Admin Support
          </button>
        </div>

        <div className="chats-section">
          {recentChats.length > 0 ? <h3>Recent Chats</h3> : null}
          {recentChats.map((chat) => (
            <button
              key={`recent-${chat.id}`}
              type="button"
              className="chat-tile"
              onClick={() => openThread(chat)}
            >
              <div className="chat-avatar">
                {(chat.name || 'M').slice(0, 1)}
                {chat.active ? <span className="chat-dot" /> : null}
              </div>
              <div className="chat-body">
                <div className="chat-row">
                  <strong>{chat.name}</strong>
                  <span className={`chat-time ${chat.unread ? 'active' : ''}`}>
                    {chat.time}
                  </span>
                </div>
                <div className="chat-row chat-row--sub">
                  {chat.lastFromUser ? <ChatCheck seen={chat.seen} /> : null}
                  <span className="chat-message">{chat.message}</span>
                  {chat.unread ? <span className="chat-unread">{chat.unread}</span> : null}
                </div>
                <span className="chat-role">{chat.role}</span>
              </div>
            </button>
          ))}
          {recentChats.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0', color: '#7d8190', fontWeight: 600 }}>
              No recent conversations yet. Start by tapping a mentor or student to send the first message.
            </div>
          ) : null}
        </div>

        <div className="chats-section">
          <h3>{sectionTitle}</h3>
          {chats.map((chat) => (
            <button
              key={`mentor-${chat.id}`}
              type="button"
              className="chat-tile"
              onClick={() => openThread(chat)}
            >
              <div className="chat-avatar">
                {(chat.name || 'M').slice(0, 1)}
                {chat.active ? <span className="chat-dot" /> : null}
              </div>
              <div className="chat-body">
                <div className="chat-row">
                  <strong>{chat.name}</strong>
                  <span className={`chat-time ${chat.unread ? 'active' : ''}`}>
                    {chat.time || 'Now'}
                  </span>
                </div>
                <div className="chat-row chat-row--sub">
                  {chat.lastFromUser ? <ChatCheck seen={chat.seen} /> : null}
                  <span className="chat-message">
                    {chat.message || 'Tap to start chat'}
                  </span>
                  {chat.unread ? <span className="chat-unread">{chat.unread}</span> : null}
                </div>
                <span className="chat-role">{chat.role}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <MainBottomNav currentIndex={2} />
    </div>
  );
}

