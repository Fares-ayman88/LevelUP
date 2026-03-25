import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const OPTIONS = [
  { id: 'special_offers', label: 'Special Offers', defaultValue: true },
  { id: 'sound', label: 'Sound', defaultValue: true },
  { id: 'vibrate', label: 'Vibrate', defaultValue: false },
  { id: 'general', label: 'General Notification', defaultValue: true },
  { id: 'promo_discount', label: 'Promo & Discount', defaultValue: false },
  { id: 'payment_options', label: 'Payment Options', defaultValue: true },
  { id: 'app_update', label: 'App Update', defaultValue: true },
  { id: 'new_service', label: 'New Service Available', defaultValue: false },
  { id: 'new_tips', label: 'New Tips Available', defaultValue: false },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [values, setValues] = useState(
    () => Object.fromEntries(OPTIONS.map((option) => [option.id, option.defaultValue])),
  );

  const toggle = (id) => {
    setValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Notification</h2>
        </div>
        <div className="settings-list">
          {OPTIONS.map((option) => (
            <div key={option.id} className="settings-row">
              <span>{option.label}</span>
              <button
                type="button"
                className={`toggle ${values[option.id] ? 'on' : ''}`}
                onClick={() => toggle(option.id)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
