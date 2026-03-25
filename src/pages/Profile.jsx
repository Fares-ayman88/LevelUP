import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import Toast from '../components/Toast.jsx';
import { signOut, useAuth } from '../state/auth.jsx';

const MENU = [
  { label: 'Edit Profile', route: '/edit-profile' },
  { label: 'Notifications', route: '/notification-settings' },
  { label: 'Payment Option', route: '/payment-option' },
  { label: 'Saved Courses', route: '/saved-courses' },
  { label: 'Security', route: '/security' },
  { label: 'Language', route: '/language', trailing: 'English (US)' },
  { label: 'Dark Mode', route: null, info: 'Coming soon' },
  { label: 'Terms & Conditions', route: '/terms-conditions' },
  { label: 'Help Center', route: null, info: 'Coming soon' },
  { label: 'Invite Friends', route: '/invite-friends' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [message, setMessage] = useState('');

  const name = profile?.name || profile?.email || 'Student';
  const email = profile?.email || 'Not set';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/sign-in', { replace: true });
    } catch {
      setMessage('Sign out failed. Try again.');
    }
  };

  return (
    <div className="home-screen">
      <div className="screen">
        <div className="mycourses-header">
          <button type="button" className="circle-btn" onClick={() => navigate(-1)}>
            <span style={{ fontWeight: 700 }}>&lt;</span>
          </button>
          <h3>Profile</h3>
          <span />
        </div>

        <div className="profile-card">
          <div className="profile-avatar-lg">{name[0]?.toUpperCase()}</div>
          <div className="profile-card__name">{name}</div>
          <div className="profile-card__email">{email}</div>
        </div>

        <div className="profile-menu">
          {MENU.map((item) => (
            <button
              key={item.label}
              type="button"
              className="profile-menu__item"
              onClick={() => {
                if (item.route) {
                  navigate(item.route);
                } else if (item.info) {
                  setMessage(item.info);
                }
              }}
            >
              <span>{item.label}</span>
              <span className="profile-menu__trailing">
                {item.trailing || '>'}
              </span>
            </button>
          ))}
        </div>

        <div className="profile-actions">
          <button type="button" className="profile-actions__secondary" onClick={() => navigate('/sign-in')}>
            Switch Account
          </button>
          <button type="button" className="profile-actions__danger" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
      <MainBottomNav currentIndex={4} />
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
