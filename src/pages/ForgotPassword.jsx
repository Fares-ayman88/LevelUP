import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CONTACTS = [
  {
    id: 'email',
    title: 'Via Email',
    value: 'priscilla.frank26@gmail.com',
    icon: '@',
    masked: 'priscilla.frank26@gmail.com',
  },
  {
    id: 'sms',
    title: 'Via SMS',
    value: '(+1) 480-894-5529',
    icon: 'SMS',
    masked: '(+1) ***-****-5529',
  },
];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('email');
  const handleContinue = () => {
    const selectedContact = CONTACTS.find((item) => item.id === selected) || CONTACTS[0];
    navigate('/forgot-password-otp', {
      state: {
        channelLabel: selectedContact.title,
        contactValue: selectedContact.value,
        maskedValue: selectedContact.masked || selectedContact.value,
      },
    });
  };

  return (
    <div className="forgot-password">
      <div className="screen screen--narrow">
        <div className="forgot-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Forgot Password</h2>
        </div>
        <div className="forgot-title">
          Select which contact details should we use to
          <br />
          Reset Your Password
        </div>
        <div className="forgot-options">
          {CONTACTS.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className={`forgot-card ${selected === contact.id ? 'active' : ''}`}
              onClick={() => setSelected(contact.id)}
            >
              <div className="forgot-icon">{contact.icon}</div>
              <div>
                <div className="forgot-card__title">{contact.title}</div>
                <div className="forgot-card__value">{contact.value}</div>
              </div>
            </button>
          ))}
        </div>
        <button type="button" className="forgot-primary" onClick={handleContinue}>
          <span>Continue</span>
          <span className="forgot-primary__arrow">&gt;</span>
        </button>
      </div>
    </div>
  );
}
