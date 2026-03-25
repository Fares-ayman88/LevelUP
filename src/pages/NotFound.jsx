import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page">
      <header className="page__hero">
        <span className="pill">404</span>
        <h1>Page Not Found</h1>
        <p className="page__subtitle">
          The page you are looking for does not exist yet.
        </p>
        <Link className="button" to="/sign-in">
          Back to Sign In
        </Link>
      </header>
    </main>
  );
}
