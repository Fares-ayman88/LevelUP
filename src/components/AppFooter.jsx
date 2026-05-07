import { Link, useLocation } from 'react-router-dom';
import './AppFooter.css';

const HIDDEN_ROUTE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/verify-email',
  '/fill-profile',
  '/create-pin',
  '/biometric',
  '/forgot-password',
  '/create-new-password',
  '/password-reset-success',
  '/pin-auth',
  '/call',
  '/lesson-player',
  '/mentor-chat-thread',
  '/support-chat-thread',
];

const primaryLinks = [
  { label: 'Home', to: '/home' },
  { label: 'Courses', to: '/my-courses' },
  { label: 'AI Chat', to: '/indox' },
  { label: 'Wallet', to: '/transactions' },
];

const supportLinks = [
  { label: 'User Flow', to: '/user-flow' },
  { label: 'Support', to: '/support-chats' },
  { label: 'Security', to: '/security' },
  { label: 'Terms', to: '/terms-conditions' },
];

export default function AppFooter() {
  const { pathname } = useLocation();
  const shouldHide = HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (shouldHide) return null;

  return (
    <footer className="app-footer" aria-label="LevelUp footer">
      <div className="app-footer__inner">
        <section className="app-footer__brand" aria-label="LevelUp summary">
          <Link className="app-footer__brand-link" to="/home">
            <span className="app-footer__logo-shell" aria-hidden>
              <img src="/assets/ul_logo.png" alt="" />
            </span>
            <span className="app-footer__brand-copy">
              <strong>LevelUp</strong>
              <span>Structured learning for students, mentors, and admins.</span>
            </span>
          </Link>
          <p>
            A learning workspace that keeps discovery, enrollment, course progress,
            payments, certificates, and support in one connected flow.
          </p>
        </section>

        <nav className="app-footer__nav" aria-label="Product links">
          <h2>Platform</h2>
          {primaryLinks.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="app-footer__nav" aria-label="Support links">
          <h2>Guidance</h2>
          {supportLinks.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="app-footer__flow" aria-label="Project flow">
          <span className="app-footer__flow-icon material-icons-round" aria-hidden>
            account_tree
          </span>
          <div>
            <h2>Project User Flow</h2>
            <p>
              See how users move from account setup to learning, payment,
              support, and admin operations.
            </p>
          </div>
          <Link className="app-footer__flow-link" to="/user-flow">
            Open Flow
            <span className="material-icons-round" aria-hidden>
              arrow_forward
            </span>
          </Link>
        </section>
      </div>

      <div className="app-footer__bottom">
        <span>Copyright 2026 LevelUp. All rights reserved.</span>
        <span>Built for clear learning journeys.</span>
      </div>
    </footer>
  );
}
