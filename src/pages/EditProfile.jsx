import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { useAuth } from '../state/auth.jsx';
import { IconMail } from '../components/Icons.jsx';

const COUNTRIES = [
  { name: 'United States', dialCode: '+1', flag: 'US' },
  { name: 'Egypt', dialCode: '+20', flag: 'EG' },
  { name: 'Saudi Arabia', dialCode: '+966', flag: 'SA' },
  { name: 'United Kingdom', dialCode: '+44', flag: 'UK' },
  { name: 'United Arab Emirates', dialCode: '+971', flag: 'AE' },
];

const GENDERS = ['Male', 'Female', 'Prefer not to answer'];

export default function EditProfile() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [showGenders, setShowGenders] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFullName(profile?.fullName || profile?.name || '');
    setNickName(profile?.nickName || '');
    setDob(profile?.dateOfBirth || '');
    setEmail(profile?.email || user?.email || '');
    setPhone(profile?.phone || '');
  }, [profile, user]);

  const formatDob = (value) => {
    const digits = value.replace(/[^0-9]/g, '');
    let result = '';
    for (let i = 0; i < digits.length && i < 8; i += 1) {
      if (i === 2 || i === 4) result += '/';
      result += digits[i];
    }
    return result;
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatar(url);
  };

  const handleUpdate = () => {
    if (saving) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMessage('Profile updated successfully.');
    }, 900);
  };

  return (
    <div className="edit-profile">
      <div className="screen screen--narrow">
        <div className="edit-profile__header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Edit Profile</h2>
          <span className="edit-profile__status">{saving ? 'Saving...' : ''}</span>
        </div>
        <div className="edit-profile__avatar" onClick={handleAvatarPick}>
          {avatar ? (
            <img src={avatar} alt="Avatar" />
          ) : (
            <span className="edit-profile__avatar-placeholder">IMG</span>
          )}
          <button type="button" className="edit-profile__avatar-btn" onClick={handleAvatarPick}>
            <span>Edit</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="edit-profile__form">
          <div className="profile-field">
            <input
              placeholder="Full Name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="profile-field">
            <input
              placeholder="Nick Name"
              value={nickName}
              onChange={(event) => setNickName(event.target.value)}
            />
          </div>
          <div className="profile-field">
            <input
              placeholder="Date of Birth"
              value={dob}
              onChange={(event) => setDob(formatDob(event.target.value))}
            />
          </div>
          <div className="profile-field">
            <span className="profile-field__icon">
              <IconMail />
            </span>
            <input
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="profile-phone">
            <button type="button" className="auth-field__toggle" onClick={() => setShowCountries(true)}>
              <div className="profile-flag">{country.flag}</div>
            </button>
            <span style={{ fontWeight: 700 }}>{country.dialCode}</span>
            <input
              placeholder="Phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="profile-select" onClick={() => setShowGenders(true)}>
            <span className={gender ? '' : 'muted'}>{gender || 'Gender'}</span>
            <span>v</span>
          </div>
        </div>
        <button type="button" className="edit-profile__button" onClick={handleUpdate}>
          <span>{saving ? 'Updating' : 'Update'}</span>
          <span className="edit-profile__button-arrow">&gt;</span>
        </button>
      </div>
      {showCountries ? (
        <div className="modal-backdrop" onClick={() => setShowCountries(false)}>
          <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Select Country</div>
            {COUNTRIES.map((item) => (
              <div
                key={item.dialCode}
                className="modal-item"
                onClick={() => {
                  setCountry(item);
                  setShowCountries(false);
                }}
              >
                <div>
                  <div>{item.flag} {item.name}</div>
                  <small>{item.dialCode}</small>
                </div>
                {item.dialCode === country.dialCode ? <span>OK</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {showGenders ? (
        <div className="modal-backdrop" onClick={() => setShowGenders(false)}>
          <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Select Gender</div>
            {GENDERS.map((item) => (
              <div
                key={item}
                className="modal-item"
                onClick={() => {
                  setGender(item);
                  setShowGenders(false);
                }}
              >
                <span>{item}</span>
                {item === gender ? <span>OK</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
