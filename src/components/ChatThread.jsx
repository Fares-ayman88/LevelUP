import { useEffect, useMemo, useRef, useState } from 'react';

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(Number(bytes))) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(bytes);
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const digits = size < 10 && index > 0 ? 1 : 0;
  return `${size.toFixed(digits)} ${units[index]}`;
};

const normalizeMessages = (items) =>
  (items || []).map((item, index) => ({
    id: item.id || `msg-${index}`,
    from: item.from || 'assistant',
    type: item.type || 'text',
    text: item.text || '',
    rating: item.rating || 0,
    images: item.images || item.imagePaths || [],
    files: item.files || [],
  }));

const BackIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="chat-thread__icon-svg">
    <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const CallIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="chat-thread__icon-svg">
    <path
      d="M6.6 2.8c.3-.4.8-.6 1.3-.6h2.2c.6 0 1.2.4 1.3 1l.7 3.1c.1.5-.1 1-.5 1.3l-1.6 1.2a14 14 0 0 0 5.7 5.7l1.2-1.6c.3-.4.8-.6 1.3-.5l3.1.7c.6.1 1 .6 1 1.3v2.2c0 .5-.2 1-.6 1.3-1 .8-2.3 1.3-3.6 1.3-6.3 0-11.4-5.1-11.4-11.4 0-1.3.5-2.6 1.3-3.6z"
      fill="currentColor"
    />
  </svg>
);

const VideoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="chat-thread__icon-svg">
    <path
      d="M3 7c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2v2.2l3.5-2c.7-.4 1.5.1 1.5.9v7.8c0 .8-.8 1.3-1.5.9l-3.5-2V17c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z"
      fill="currentColor"
    />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="chat-thread__icon-svg">
    <path
      d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l3.9 3.9-1.4 1.4-3.9-3.9A6.5 6.5 0 1 1 10.5 4zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"
      fill="currentColor"
    />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="chat-thread__icon-svg">
    <circle cx="6" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="18" cy="12" r="2" fill="currentColor" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="chat-thread__send-icon">
    <path
      d="M5 12h13l-5-5 1.4-1.4L22.8 14l-8.4 8.4L13 21l5-5H5z"
      fill="currentColor"
    />
  </svg>
);

export default function ChatThread({
  title,
  subtitle,
  onBack,
  onCall,
  onVideo,
  onSearch,
  onMenu,
  messages: externalMessages,
  onSendText,
  onSendAttachments,
  sending = false,
  initialMessages = [],
  composerHint = 'Type a message...',
  showAttachmentButton = true,
  showCall,
  showVideo,
  showSearch = false,
  showMenu = false,
  avatarText,
}) {
  const controlled = Array.isArray(externalMessages);
  const [messages, setMessages] = useState(() => normalizeMessages(initialMessages));
  const [input, setInput] = useState('');
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const scrollRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const visibleMessages = controlled
    ? normalizeMessages(externalMessages)
    : messages;

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages]);

  useEffect(() => {
    if (controlled) return;
    setMessages(normalizeMessages(initialMessages));
  }, [controlled, initialMessages]);

  const initials = useMemo(() => {
    const base = (avatarText || title || '').trim();
    if (!base) return 'A';
    return base[0].toUpperCase();
  }, [avatarText, title]);

  const showCallActions = showCall ?? Boolean(onCall || onVideo);
  const showVideoAction = showVideo ?? showCallActions;
  const showSearchAction = showSearch && Boolean(onSearch);
  const showMenuAction = showMenu && Boolean(onMenu);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    const next = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from: 'user',
      type: 'text',
      text,
    };
    if (!controlled) {
      setMessages((prev) => [...prev, next]);
    }
    setInput('');
    if (onSendText) {
      await onSendText(text);
    }
  };

  const handlePickAttachment = async (event) => {
    if (!onSendAttachments) return;
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setAttachmentBusy(true);
    try {
      const attachments = files.map((file) => ({
        file,
        name: file.name || '',
        size: Number(file.size) || 0,
        isImage: (file.type || '').startsWith('image/'),
      }));
      await onSendAttachments(attachments);
    } finally {
      setAttachmentBusy(false);
    }
  };

  const renderTyping = () => (
    <div className="chat-thread__typing">
      <span />
      <span />
      <span />
    </div>
  );

  const renderStars = (rating) => (
    <div className="chat-thread__rating-stars">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={`star-${index}`}
          className={`chat-thread__rating-star ${index < rating ? 'active' : ''}`}
        />
      ))}
    </div>
  );

  const renderBubble = (message) => {
    if (message.type === 'typing' || message.text.trim() === '...') {
      return renderTyping();
    }
    if (message.type === 'images') {
      const images = message.images || [];
      return (
        <div className="chat-thread__image-grid">
          {(images.length ? images.slice(0, 2) : [null, null]).map((src, index) => (
            <div key={`img-${index}`} className="chat-thread__image-cell">
              {src ? <img src={src} alt="Attachment" /> : null}
            </div>
          ))}
        </div>
      );
    }
    if (message.type === 'files') {
      const files = message.files || [];
      return (
        <div className="chat-thread__file-list">
          {files.map((file, index) => (
            <div key={`file-${index}`} className="chat-thread__file">
              <span className="chat-thread__file-icon" />
              <div>
                <div className="chat-thread__file-name">{file.name || 'File'}</div>
                <div className="chat-thread__file-size">
                  {formatFileSize(file.size)}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (message.type === 'rating') {
      return (
        <div className="chat-thread__rating">
          <div className="chat-thread__text">{message.text}</div>
          {renderStars(message.rating || 0)}
        </div>
      );
    }
    return <div className="chat-thread__text">{message.text}</div>;
  };

  return (
    <div className="chat-thread">
      <div className="chat-thread__hero">
        <div className="chat-thread__header-card">
          <button type="button" className="chat-thread__back" onClick={onBack}>
            <BackIcon />
          </button>
          <div className="chat-thread__avatar">
            <span className="chat-thread__avatar-letter">{initials}</span>
            <span className="chat-thread__status" />
          </div>
          <div className="chat-thread__title-block">
            <div className="chat-thread__title">{title}</div>
            {subtitle ? (
              <div className="chat-thread__subtitle">{subtitle}</div>
            ) : null}
          </div>
          <div className="chat-thread__header-actions">
            {showCallActions ? (
              <button
                type="button"
                className="chat-thread__header-icon"
                onClick={onCall}
                aria-label="Call"
              >
                <CallIcon />
              </button>
            ) : null}
            {showVideoAction ? (
              <button
                type="button"
                className="chat-thread__header-icon"
                onClick={onVideo || onCall}
                aria-label="Video"
              >
                <VideoIcon />
              </button>
            ) : null}
            {showSearchAction ? (
              <button
                type="button"
                className="chat-thread__header-icon"
                onClick={onSearch}
                aria-label="Search"
              >
                <SearchIcon />
              </button>
            ) : null}
            {showMenuAction ? (
              <button
                type="button"
                className="chat-thread__header-icon"
                onClick={onMenu}
                aria-label="Menu"
              >
                <MenuIcon />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="chat-thread__body" ref={scrollRef}>
        {visibleMessages.length === 0 ? (
          <div className="chat-thread__empty">No messages yet</div>
        ) : (
          <div className="chat-thread__messages">
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`chat-thread__message ${
                  message.from === 'user' ? 'user' : 'assistant'
                }`}
              >
                <div className="chat-thread__bubble">{renderBubble(message)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <form
        className="chat-thread__composer"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        {showAttachmentButton ? (
          <button
            type="button"
            className="chat-thread__attach"
            aria-label="Attach"
            onClick={() => attachmentInputRef.current?.click()}
            disabled={!onSendAttachments || attachmentBusy || sending}
          >
            +
          </button>
        ) : null}
        <input
          ref={attachmentInputRef}
          type="file"
          multiple
          hidden
          onChange={handlePickAttachment}
        />
        <input
          type="text"
          placeholder={composerHint}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={sending || attachmentBusy}
        />
        <button
          type="submit"
          className={`chat-thread__send ${input.trim() ? 'active' : ''}`}
          aria-label="Send message"
          disabled={sending || attachmentBusy || !input.trim()}
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
