import './GlobalLoader.css';

export default function LoadingScreen({ label = 'Loading...' }) {
  return (
    <main className="loading-page--pro" aria-busy="true">
      <div className="loading-card--pro" role="status" aria-live="polite">
        <div className="loading-card__mark" aria-hidden>
          <div className="loading-card__ring" />
          <div className="loading-card__core">L</div>
        </div>
        <div className="loading-card__copy">
          <strong>{label}</strong>
          <span>Preparing your workspace</span>
        </div>
        <div className="loading-card__bar" aria-hidden>
          <span />
        </div>
      </div>
    </main>
  );
}
