import { useEffect, useRef, useState } from 'react';

import {
  getGlobalLoadingSnapshot,
  subscribeGlobalLoading,
} from '../services/globalLoading.js';
import './GlobalLoader.css';

const SHOW_DELAY_MS = 180;
const MIN_VISIBLE_MS = 360;

export default function GlobalLoader() {
  const [snapshot, setSnapshot] = useState(() => getGlobalLoadingSnapshot());
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => subscribeGlobalLoading(setSnapshot), []);

  useEffect(() => {
    window.clearTimeout(showTimerRef.current);
    window.clearTimeout(hideTimerRef.current);

    if (snapshot.active) {
      showTimerRef.current = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setVisible(true);
      }, visible ? 0 : SHOW_DELAY_MS);
      return () => window.clearTimeout(showTimerRef.current);
    }

    if (!visible) return undefined;

    const elapsed = Date.now() - shownAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, remaining);

    return () => window.clearTimeout(hideTimerRef.current);
  }, [snapshot.active, visible]);

  if (!visible) return null;

  return (
    <div className="global-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="global-loader__panel">
        <div className="global-loader__mark" aria-hidden>
          <div className="global-loader__ring" />
          <div className="global-loader__core">L</div>
        </div>
        <div className="global-loader__copy">
          <strong>{snapshot.label || 'Loading...'}</strong>
          <span>Preparing your workspace</span>
        </div>
        <div className="global-loader__bar" aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}
