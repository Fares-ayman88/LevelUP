import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = {
  alerts: {
    label: 'Alerts',
    items: [
      { id: 'special_offers', label: 'Special Offers', defaultValue: true },
      { id: 'promo_discount', label: 'Promo & Discount', defaultValue: false },
    ],
  },
  system: {
    label: 'System',
    items: [
      { id: 'app_update', label: 'App Update', defaultValue: true },
      { id: 'new_service', label: 'New Service Available', defaultValue: false },
      { id: 'new_tips', label: 'New Tips Available', defaultValue: false },
    ],
  },
  payment: {
    label: 'Payment',
    items: [
      { id: 'payment_options', label: 'Payment Options', defaultValue: true },
      { id: 'general', label: 'General Notification', defaultValue: true },
    ],
  },
  device: {
    label: 'Device Settings',
    items: [
      { id: 'sound', label: 'Sound', defaultValue: true },
      { id: 'vibrate', label: 'Vibrate', defaultValue: false },
    ],
  },
};

const FREQUENCIES = [
  { id: 'realtime', label: 'Real-time', value: 'realtime' },
  { id: 'hourly', label: 'Hourly Digest', value: 'hourly' },
  { id: 'daily', label: 'Daily Digest', value: 'daily' },
];

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [values, setValues] = useState(() => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      return JSON.parse(saved);
    }
    const defaults = {};
    Object.values(CATEGORIES).forEach(cat => {
      cat.items.forEach(item => {
        defaults[item.id] = item.defaultValue;
      });
    });
    return defaults;
  });

  const [frequency, setFrequency] = useState(() => {
    return localStorage.getItem('notificationFrequency') || 'realtime';
  });

  const [doNotDisturb, setDoNotDisturb] = useState(() => {
    return localStorage.getItem('doNotDisturb') === 'true';
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('notificationPreferences', JSON.stringify(values));
  }, [values]);

  useEffect(() => {
    localStorage.setItem('notificationFrequency', frequency);
  }, [frequency]);

  useEffect(() => {
    localStorage.setItem('doNotDisturb', doNotDisturb);
  }, [doNotDisturb]);

  const toggle = (id) => {
    setValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button 
            type="button" 
            className="icon-btn" 
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Notification Settings</h2>
        </div>

        {/* Do Not Disturb */}
        <div className="settings-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#7d818f' }}>
            Do Not Disturb
          </h3>
          <div className="settings-row">
            <span>Enable Do Not Disturb</span>
            <button
              type="button"
              className={`toggle ${doNotDisturb ? 'on' : ''}`}
              onClick={() => setDoNotDisturb(!doNotDisturb)}
              role="switch"
              aria-checked={doNotDisturb}
              aria-label="Toggle do not disturb mode"
            >
              <span className="toggle-thumb" />
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#9aa1b8', margin: '8px 0 0' }}>
            {doNotDisturb ? 'Notifications are muted' : 'Receive all notifications'}
          </p>
        </div>

        {/* Frequency */}
        <div className="settings-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#7d818f' }}>
            Notification Frequency
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FREQUENCIES.map((freq) => (
              <label key={freq.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="frequency"
                  value={freq.value}
                  checked={frequency === freq.value}
                  onChange={(e) => setFrequency(e.target.value)}
                  style={{ cursor: 'pointer' }}
                />
                <span>{freq.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="settings-list">
          {Object.entries(CATEGORIES).map(([catKey, category]) => (
            <div key={catKey} style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '700', color: '#7d818f' }}>
                {category.label}
              </h3>
              {category.items.map((item) => (
                <div key={item.id} className="settings-row">
                  <span>{item.label}</span>
                  <button
                    type="button"
                    className={`toggle ${values[item.id] ? 'on' : ''}`}
                    onClick={() => toggle(item.id)}
                    role="switch"
                    aria-checked={values[item.id]}
                    aria-label={`Toggle ${item.label}`}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
