import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
};

export default function Call() {
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name || 'Call';
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="call-screen">
      <div className="call-screen__header">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
          <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
        </button>
      </div>
      <div className="call-screen__body">
        <div className="call-avatar" />
        <h2>{name}</h2>
        <p>{formatDuration(seconds)} Minutes</p>
      </div>
      <div className="call-screen__actions">
        <button
          type="button"
          className="call-action call-action--soft"
          onClick={() => setMuted((prev) => !prev)}
        >
          {muted ? 'Mic Off' : 'Mic'}
        </button>
        <button
          type="button"
          className="call-action call-action--danger"
          onClick={() => navigate(-1)}
        >
          End
        </button>
        <button
          type="button"
          className="call-action call-action--primary"
          onClick={() => setVideoOff((prev) => !prev)}
        >
          {videoOff ? 'Video Off' : 'Video'}
        </button>
      </div>
    </div>
  );
}
