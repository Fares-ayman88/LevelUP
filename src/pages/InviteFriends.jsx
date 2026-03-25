import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CONTACTS = [
  { name: 'Virginia M. Patterson', phone: '(+1) 702-897-7965' },
  { name: 'Dominick S. Jenkins', phone: '(+1) 702-897-7965' },
  { name: 'Duncan E. Hoffman', phone: '(+1) 727-688-4052' },
  { name: 'Roy R. McCraney', phone: '(+1) 601-897-1714' },
  { name: 'Janice R. Norris', phone: '(+1) 802-312-3206' },
];

const SHARE_OPTIONS = [
  { label: 'f', color: '#1877F2' },
  { label: 't', color: '#1DA1F2' },
  { label: 'G+', color: '#DB4437' },
  { label: 'w', color: '#25D366' },
];

const initialsFor = (name) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export default function InviteFriends() {
  const navigate = useNavigate();
  const [invited, setInvited] = useState({});

  const toggleInvite = (name) => {
    setInvited((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div className="invite-page">
      <div className="screen screen--narrow">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Invite Friends</h2>
        </div>
        <div className="invite-card">
          {CONTACTS.map((contact, index) => (
            <div key={contact.name}>
              <div className="invite-row">
                <div className="invite-avatar">{initialsFor(contact.name)}</div>
                <div className="invite-info">
                  <strong>{contact.name}</strong>
                  <span>{contact.phone}</span>
                </div>
                <button
                  type="button"
                  className={`invite-button ${invited[contact.name] ? 'active' : ''}`}
                  onClick={() => toggleInvite(contact.name)}
                >
                  {invited[contact.name] ? 'Invited' : 'Invite'}
                </button>
              </div>
              {index !== CONTACTS.length - 1 ? (
                <div className="invite-divider" />
              ) : null}
            </div>
          ))}
        </div>
        <h3 className="invite-share-title">Share Invite</h3>
        <div className="invite-share">
          {SHARE_OPTIONS.map((option) => (
            <div
              key={option.label}
              className="share-badge"
              style={{
                backgroundColor: `${option.color}26`,
                color: option.color,
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
