import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import { fetchMentors } from '../services/homeData.js';
import {
  formatSummaryTime,
  subscribeUserChats,
} from '../services/mentorChatService.js';
import { useAuth } from '../state/auth.jsx';

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

function mergeMentorsWithChats(mentors, summaries) {
  const byMentorId = new Map(
    (summaries || []).map((item) => [item.mentorId, item])
  );
  const byName = new Map(
    (summaries || []).map((item) => [item.mentorName.trim().toLowerCase(), item])
  );

  const merged = (mentors || []).map((mentor) => {
    const summary =
      byMentorId.get(mentor.id) ||
      byName.get(`${mentor.name || ''}`.trim().toLowerCase()) ||
      null;
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
      hasRealChat: Boolean(summary?.lastMessage && summary.lastMessage.trim()),
    };
  });

  for (const summary of summaries || []) {
    const exists = merged.some((item) => item.id === summary.mentorId);
    if (exists) continue;
    merged.push({
      id: summary.mentorId || summary.conversationId,
      conversationId: summary.conversationId,
      name: summary.mentorName || 'Mentor',
      role: summary.mentorRole || 'Mentor',
      imagePath: summary.mentorImagePath || '',
      message: summary.lastMessage || 'Tap to start chat',
      time: summary.lastMessageAt ? formatSummaryTime(summary.lastMessageAt) : '',
      unread: summary.unreadForUser || 0,
      active: summary.activeForMentor || false,
      lastFromUser: summary.lastMessageFromUser || false,
      seen: summary.lastSeenByMentor ?? true,
      hasRealChat: Boolean(summary.lastMessage && summary.lastMessage.trim()),
    });
  }
  return merged;
}

export default function MentorChats() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    const unsubscribe = subscribeUserChats(
      user.uid,
      (items) => setSummaries(items || []),
      () => {}
    );
    return unsubscribe;
  }, [user?.uid]);

  const chats = useMemo(() => mergeMentorsWithChats(mentors, summaries), [mentors, summaries]);
  const recentChats = useMemo(
    () => chats.filter((item) => item.hasRealChat && item.time),
    [chats]
  );

  const openThread = (chat) => {
    navigate('/mentor-chat-thread', {
      state: {
        mentorId: chat.id,
        name: chat.name,
        role: chat.role,
        imagePath: chat.imagePath,
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
          <h2>Mentor Chats</h2>
          <button type="button" className="chats-icon">
            <MoreIcon />
          </button>
        </div>
        <div className="chats-tabs">
          <button type="button" className="chats-tab" onClick={() => navigate('/indox')}>
            Indox
          </button>
          <button type="button" className="chats-tab active">Mentor Chats</button>
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
                  {chat.lastFromUser ? (
                    <ChatCheck seen={chat.seen} />
                  ) : null}
                  <span className="chat-message">{chat.message}</span>
                  {chat.unread ? (
                    <span className="chat-unread">{chat.unread}</span>
                  ) : null}
                </div>
                <span className="chat-role">{chat.role}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="chats-section">
          <h3>Mentors</h3>
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
                  {chat.lastFromUser ? (
                    <ChatCheck seen={chat.seen} />
                  ) : null}
                  <span className="chat-message">
                    {chat.message || 'Tap to start chat'}
                  </span>
                  {chat.unread ? (
                    <span className="chat-unread">{chat.unread}</span>
                  ) : null}
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

