import { Link, useLocation } from 'react-router-dom';
import './AppFooter.css';

const HIDDEN_ROUTE_PATHS = ['/', '/presentation'];
const HIDDEN_ROUTE_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/verify-otp',
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

const footerSections = [
  {
    title: 'Certifications by Issuer',
    links: [
      { label: 'LevelUp Certificates', to: '/certificate' },
      { label: 'Programming Certificates', to: '/search-results' },
      { label: 'Design Certificates', to: '/search-results' },
      { label: 'Business Certificates', to: '/search-results' },
      { label: 'View all certificates', to: '/all-category' },
    ],
  },
  {
    title: 'Web Development',
    links: [
      { label: 'Web Development', to: '/search-results' },
      { label: 'JavaScript', to: '/search-results' },
      { label: 'React JS', to: '/search-results' },
      { label: 'Programming', to: '/search-results' },
      { label: 'Mobile Development', to: '/search-results' },
    ],
  },
  {
    title: 'IT & Technology',
    links: [
      { label: 'Programming', to: '/search-results' },
      { label: 'Flutter Development', to: '/search-results' },
      { label: 'Dart Essentials', to: '/search-results' },
      { label: 'AI Chat', to: '/indox' },
      { label: 'Saved Courses', to: '/saved-courses' },
    ],
  },
  {
    title: 'Leadership',
    links: [
      { label: 'Personal Development', to: '/search-results' },
      { label: 'HR Management', to: '/search-results' },
      { label: 'Project Guidance', to: '/user-flow' },
      { label: 'Mentors', to: '/top-mentors' },
      { label: 'Learning Progress', to: '/my-courses' },
    ],
  },
  {
    title: 'Business & Data',
    links: [
      { label: 'Finance & Accounting', to: '/search-results' },
      { label: 'Office Productivity', to: '/search-results' },
      { label: 'Business', to: '/search-results' },
      { label: 'Transactions', to: '/transactions' },
      { label: 'Payment Methods', to: '/payment-methods' },
    ],
  },
  {
    title: 'Communication',
    links: [
      { label: 'Support Chats', to: '/support-chats' },
      { label: 'Mentor Chats', to: '/mentor-chats' },
      { label: 'Invite Friends', to: '/invite-friends' },
      { label: 'Reviews', to: '/reviews' },
      { label: 'Notifications', to: '/notifications' },
    ],
  },
  {
    title: 'Design & Creativity',
    links: [
      { label: 'Graphic Design', to: '/search-results' },
      { label: '3D Design', to: '/search-results' },
      { label: 'Photography', to: '/search-results' },
      { label: 'Arts & Humanities', to: '/search-results' },
      { label: 'Popular Courses', to: '/popular-courses' },
    ],
  },
  {
    title: 'LevelUp',
    links: [
      { label: 'Home', to: '/home' },
      { label: 'All Categories', to: '/all-category' },
      { label: 'Profile', to: '/profile' },
      { label: 'Security', to: '/security' },
      { label: 'Terms & Conditions', to: '/terms-conditions' },
    ],
  },
];

export default function AppFooter() {
  const { pathname } = useLocation();
  const shouldHide =
    HIDDEN_ROUTE_PATHS.includes(pathname) ||
    HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (shouldHide) return null;

  return (
    <footer className="app-footer" aria-label="LevelUp footer">
      <div className="app-footer__teach">
        <Link className="app-footer__teach-button" to="/instructor-registration">
          Teach on LevelUp
        </Link>
        <section className="app-footer__teach-copy" aria-label="Teach on LevelUp">
          <h2>Share your courses with learners everywhere</h2>
          <p>Create online lessons, reach students across LevelUp, and build a learning business.</p>
        </section>
      </div>

      <div className="app-footer__directory" aria-label="Footer directory">
        <h2>Explore top skills and certificates</h2>
        <div className="app-footer__links-grid">
          {footerSections.map((section) => (
            <nav key={section.title} className="app-footer__section" aria-label={section.title}>
              <h3>{section.title}</h3>
              {section.links.map((item) => (
                <Link key={`${section.title}-${item.label}`} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>

      <div className="app-footer__bottom" aria-label="Footer legal">
        <Link className="app-footer__brand" to="/home" aria-label="LevelUp home">
          <img src="/assets/ul_logo.png" alt="" aria-hidden />
          <span>LevelUp</span>
        </Link>
        <span>Copyright 2026 LevelUp. All rights reserved.</span>
      </div>
    </footer>
  );
}
