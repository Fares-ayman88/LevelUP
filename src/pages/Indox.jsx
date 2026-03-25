import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import { sendGeminiChat } from '../services/geminiProxy.js';

export default function Indox() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const history = useMemo(() =>
    messages.map((item) => ({ role: item.role, text: item.text })),
  [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setSending(true);
    try {
      const response = await sendGeminiChat({ message: text, history });
      const reply = response.reply || response.text || response.message || '...';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Could not reach assistant.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="home-screen">
      <div className="screen indox-layout">
        <div className="indox-sidebar">
          <div className="indox-sidebar__title">Chat BoT</div>
          <button type="button" className="indox-sidebar__button" onClick={() => setMessages([])}>
            + New Chat
          </button>
          <div className="indox-sidebar__hint">Your AI space is ready.</div>
        </div>

        <div className="indox-chat">
          <div className="indox-header">
            <div>
              <h3>Indox</h3>
              <p>Chat BoT</p>
            </div>
            <div className="indox-header__actions">
              <button type="button" className="circle-btn" onClick={() => navigate('/mentor-chats')}>
                M
              </button>
              <button type="button" className="circle-btn" onClick={() => navigate('/support-chats')}>
                S
              </button>
            </div>
          </div>

          <div className="indox-messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="indox-empty">
                <div className="indox-empty__icon">AI</div>
                <h4>Your AI space is ready</h4>
                <p>Ask anything about your courses or get help instantly.</p>
              </div>
            ) : (
              messages.map((item, index) => (
                <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
                  {item.text}
                </div>
              ))
            )}
          </div>

          <div className="indox-composer">
            <input
              placeholder="Message AI Assistant..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSend();
              }}
            />
            <button type="button" onClick={handleSend} disabled={sending}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
      <MainBottomNav currentIndex={2} />
    </div>
  );
}
