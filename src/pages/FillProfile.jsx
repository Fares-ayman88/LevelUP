import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { IconMail } from '../components/Icons.jsx';
import { saveUserProfile, updateAuthDisplayName, useAuth } from '../state/auth.jsx';

const COUNTRIES = [
  { name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
];

const GENDERS = ['Male', 'Female', 'Prefer not to answer'];

export default function FillProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [nickName, setNickName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('724-848-1225');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showCountries, setShowCountries] = useState(false);
  const [showGenders, setShowGenders] = useState(false);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (!email) {
      setEmail(user.email || '');
    }
  }, [user, email]);

  useEffect(() => {
    if (!user) {
      navigate('/sign-in', { replace: true });
    }
  }, [user, navigate]);

  const formatDob = (value) => {
    const digits = value.replace(/[^0-9]/g, '');
    let result = '';
    for (let i = 0; i < digits.length && i < 8; i += 1) {
      if (i === 2 || i === 4) result += '/';
      result += digits[i];
    }
    return result;
  };

  const openAvatarSheet = () => {
    setShowAvatarSheet(true);
  };

  const handleAvatarPick = (source) => {
    setShowAvatarSheet(false);
    const input = fileInputRef.current;
    if (!input) return;
    if (source === 'camera') {
      input.setAttribute('capture', 'environment');
    } else {
      input.removeAttribute('capture');
    }
    input.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatar(url);
  };

  const handleContinue = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      setMessage('Please enter your full name.');
      return;
    }
    try {
      await saveUserProfile(user.uid, {
        name: fullName.trim(),
        fullName: fullName.trim(),
        nickName: nickName.trim(),
        dateOfBirth: dob.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dialCode: country.dialCode,
        country: country.name,
        gender,
      });
      await updateAuthDisplayName(fullName.trim());
      navigate('/create-pin', { replace: true });
    } catch {
      setMessage('Could not save profile. Try again.');
    }
  };

  const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="profile-field__calendar">
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 4v4M16 4v4M4 10h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const ChevronDown = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="profile-select__arrow">
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const PersonIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="profile-avatar__icon">
      <circle cx="12" cy="8.5" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4.5 20c1.8-3.5 5-5 7.5-5s5.7 1.5 7.5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const EditIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="profile-avatar__edit-icon">
      <path
        d="M4 17.5V20h2.5l8.4-8.4-2.5-2.5L4 17.5z"
        fill="currentColor"
      />
      <path
        d="M14.9 5.6l2.5 2.5 1.4-1.4a1.8 1.8 0 0 0 0-2.5l-.1-.1a1.8 1.8 0 0 0-2.5 0l-1.3 1.5z"
        fill="currentColor"
      />
    </svg>
  );

  const CameraIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="modal-item__icon">
      <path
        d="M7 6l1.2-2h7.6L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const GalleryIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="modal-item__icon">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M6 17l4.5-4.5 3 3 2.5-2.5L20 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden className="modal-check">
      <path
        d="M5 12l4 4 10-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="app-shell fill-profile">
      <div className="screen screen--narrow fill-profile__screen">
        <div className="profile-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Fill Your Profile</h2>
        </div>
        <div style={{ height: 32 }} />
        <div className="profile-avatar" onClick={openAvatarSheet}>
          {avatar ? (
            <img src={avatar} alt="Avatar" />
          ) : (
            <div className="profile-avatar__placeholder">
              <PersonIcon />
            </div>
          )}
          <button type="button" className="profile-avatar__edit" onClick={openAvatarSheet}>
            <EditIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />
        </div>
        <div style={{ height: 32 }} />
        <div className="profile-field">
          <input
            placeholder="Full Name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
        <div style={{ height: 16 }} />
        <div className="profile-field">
          <input
            placeholder="Nick Name"
            value={nickName}
            onChange={(event) => setNickName(event.target.value)}
          />
        </div>
        <div style={{ height: 16 }} />
        <div className="profile-field">
          <span className="profile-field__icon">
            <CalendarIcon />
          </span>
          <input
            placeholder="Date of Birth (DD/MM/YYYY)"
            value={dob}
            onChange={(event) => setDob(formatDob(event.target.value))}
          />
        </div>
        <div style={{ height: 16 }} />
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
        <div style={{ height: 16 }} />
        <div className="profile-phone">
          <button
            type="button"
            className="profile-phone__country"
            onClick={() => setShowCountries(true)}
          >
            <div className="profile-flag">{country.flag}</div>
            <ChevronDown />
            <span className="profile-phone__dial">{country.dialCode}</span>
          </button>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div style={{ height: 16 }} />
        <div className="profile-select" onClick={() => setShowGenders(true)}>
          <span className={gender ? '' : 'muted'}>{gender || 'Gender'}</span>
          <ChevronDown />
        </div>
        <div style={{ height: 32 }} />
        <button type="button" className="svg-button" onClick={handleContinue}>
          <img src="/assets/fill_profile/BUTTON%20(3).png" alt="Continue" />
        </button>
      </div>
      {showCountries && (
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
                <div className="modal-item__main">
                  <div className="profile-flag">{item.flag}</div>
                  <div>
                    <div>{item.name}</div>
                    <small>{item.dialCode}</small>
                  </div>
                </div>
                {item.dialCode === country.dialCode ? <CheckIcon /> : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {showGenders && (
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
                {item === gender ? <CheckIcon /> : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {showAvatarSheet && (
        <div className="modal-backdrop" onClick={() => setShowAvatarSheet(false)}>
          <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Profile Photo</div>
            <div
              className="modal-item modal-item--icon"
              onClick={() => handleAvatarPick('camera')}
            >
              <CameraIcon />
              <span>Take a photo</span>
            </div>
            <div
              className="modal-item modal-item--icon"
              onClick={() => handleAvatarPick('gallery')}
            >
              <GalleryIcon />
              <span>Choose from gallery</span>
            </div>
          </div>
        </div>
      )}
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
