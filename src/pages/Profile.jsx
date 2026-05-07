import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import Toast from '../components/Toast.jsx';
import { subscribeInstructorRequestForUser } from '../services/instructorRequests.js';
import { uploadProfileImage } from '../services/profileImages.js';
import {
  resolveAuthRole,
  signOut,
  updateUserProfilePhoto,
  useAuth,
} from '../state/auth.jsx';
import './Profile.css';

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
  const { profile, user } = useAuth();
  const [message, setMessage] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [instructorRequest, setInstructorRequest] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const fileInputRef = useRef(null);

  const name = profile?.name || profile?.email || user?.displayName || 'Student';
  const email = profile?.email || user?.email || 'Not set';
  const photoUrl = photoPreview || profile?.photoUrl || user?.photoURL || '';
  const role = resolveAuthRole(profile, user);
  const roleLabel = role === 'admin' ? 'Admin' : role === 'instructor' ? 'Instructor' : 'Student';
  const requestStatus = `${instructorRequest?.status || ''}`.trim().toLowerCase();
  const hasPhoto = Boolean(photoUrl) && !photoFailed;

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!user?.uid || role === 'admin' || role === 'instructor') {
      setInstructorRequest(null);
      setRequestLoading(false);
      return undefined;
    }

    setRequestLoading(true);
    return subscribeInstructorRequestForUser(
      user.uid,
      (request) => {
        setInstructorRequest(request);
        setRequestLoading(false);
      },
      () => {
        setRequestLoading(false);
      }
    );
  }, [user?.uid, role]);

  const instructorCard = useMemo(() => {
    if (role === 'instructor') {
      return {
        title: 'Instructor Workspace',
        body: 'Your instructor access is active. Manage your courses, students, and earnings from the dashboard.',
        badge: 'Approved',
        action: 'Open Dashboard',
        tone: 'approved',
        route: '/instructor-dashboard',
      };
    }

    if (requestStatus === 'pending') {
      return {
        title: 'Instructor Request Submitted',
        body: 'Your application is under review. Continue the flow by sending your CV, certificates, and ID photo to the admin team.',
        badge: 'Pending Review',
        action: 'Send Documents',
        tone: 'pending',
        route: '/instructor-documents',
      };
    }

    if (requestStatus === 'rejected') {
      return {
        title: 'Apply Again',
        body: 'Your previous request needs changes. Update your details and submit a stronger instructor application.',
        badge: 'Needs Update',
        action: 'Request Again',
        tone: 'warning',
        route: '/instructor-registration',
      };
    }

    return {
      title: 'Become an Instructor',
      body: 'Share your expertise on LevelUp. Submit your teaching details, then send your documents for admin approval.',
      badge: 'Open Request',
      action: 'Request Instructor Access',
      tone: 'default',
      route: '/instructor-registration',
    };
  }, [requestStatus, role]);

  const handleInstructorAction = () => {
    if (instructorCard.route === '/instructor-documents') {
      navigate('/instructor-documents', { state: instructorRequest || {} });
      return;
    }
    navigate(instructorCard.route);
  };

  const handlePhotoPick = () => {
    if (uploadingPhoto) return;
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadingPhoto) return;

    const nextPreview = URL.createObjectURL(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(nextPreview);
    setUploadingPhoto(true);

    try {
      const uploadedUrl = await uploadProfileImage(user, file);
      await updateUserProfilePhoto(user, uploadedUrl);
      setPhotoPreview('');
      setMessage('Profile photo updated successfully.');
    } catch (error) {
      setPhotoPreview('');
      setMessage(error?.message || 'Could not update profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

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
          <button
            type="button"
            className={`profile-avatar-lg profile-avatar-lg--editable${uploadingPhoto ? ' is-uploading' : ''}`}
            onClick={handlePhotoPick}
            disabled={uploadingPhoto}
            aria-label="Change profile photo"
          >
            {hasPhoto ? (
              <img src={photoUrl} alt={`${name} profile`} onError={() => setPhotoFailed(true)} />
            ) : (
              <span>{name[0]?.toUpperCase()}</span>
            )}
            <span className="profile-avatar-lg__edit material-icons-round" aria-hidden>
              {uploadingPhoto ? 'hourglass_top' : 'photo_camera'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            hidden
          />
          <div className="profile-card__name">{name}</div>
          <div className="profile-card__email">{email}</div>
          <div className="profile-card__role">{roleLabel}</div>
        </div>

        {role !== 'admin' ? (
          <div className={`profile-instructor-card profile-instructor-card--${instructorCard.tone}`}>
            <div className="profile-instructor-card__icon material-icons-round" aria-hidden>
              co_present
            </div>
            <div className="profile-instructor-card__body">
              <span className="profile-instructor-card__badge">
                {requestLoading ? 'Checking...' : instructorCard.badge}
              </span>
              <strong>{instructorCard.title}</strong>
              <p>{instructorCard.body}</p>
              <div className="profile-instructor-card__steps" aria-label="Instructor application flow">
                <span>Application</span>
                <span>Documents</span>
                <span>Admin Review</span>
              </div>
            </div>
            <button
              type="button"
              className="profile-instructor-card__action"
              onClick={handleInstructorAction}
              disabled={requestLoading}
            >
              {requestLoading ? 'Loading...' : instructorCard.action}
            </button>
          </div>
        ) : null}

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
