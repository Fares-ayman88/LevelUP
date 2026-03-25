import { Link } from 'react-router-dom';

import { routeConfig } from '../routes.jsx';

export default function Placeholder({ title, path }) {
  return (
    <main className="page">
      <header className="page__hero">
        <span className="pill">LevelUp Web</span>
        <h1>{title}</h1>
        <p className="page__subtitle">Route: {path}</p>
      </header>
      <section className="page__panel">
        <h2>Navigation</h2>
        <p className="page__muted">
          These are placeholder routes mapped from the Flutter app. Replace
          each screen with its real React UI.
        </p>
        <div className="nav-grid">
          {routeConfig.map((route) => (
            <Link key={route.path} to={route.path} className="nav-card">
              <span className="nav-card__title">{route.title}</span>
              <span className="nav-card__path">{route.path}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
