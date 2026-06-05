import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { submitInstructorRequest } from '../services/instructorRequests.js';
import { useAuth } from '../state/auth.jsx';

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => /^[+]?[\d\s\-()]+$/.test(phone.trim());

export default function InstructorRegistration() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [coursesTaken, setCoursesTaken] = useState('');
  const [experience, setExperience] = useState('');
  const [notes, setNotes] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Invalid phone format';
    } else if (phone.replace(/\D/g, '').length < 7) {
      newErrors.phone = 'Phone number must have at least 7 digits';
    }

    if (!category.trim()) {
      newErrors.category = 'Specialization/Category is required';
    }

    if (experience && (isNaN(experience) || parseInt(experience, 10) < 0 || parseInt(experience, 10) > 100)) {
      newErrors.experience = 'Experience must be a number between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!validateForm()) {
      setMessage('Please fix the errors above');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    const submittedData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      category: category.trim(),
      coursesTaken: coursesTaken.trim(),
      experienceYears: experience.trim() ? parseInt(experience, 10) : 0,
      notes: notes.trim(),
    };

    try {
      const request = await submitInstructorRequest({
        user,
        ...submittedData,
      });
      setMessageType('success');
      navigate('/instructor-documents', {
        state: {
          ...submittedData,
          ...(request || {}),
          submitted: true,
        },
      });
    } catch (error) {
      console.error('Error submitting instructor request:', error);
      if (error.code === 'TOO_MANY_INSTRUCTOR_REQUESTS') {
        setMessage('You have submitted too many applications. Please try again later.');
      } else if (error.code === 'DUPLICATE_REQUEST') {
        setMessage('You have already submitted an application. Please wait 24 hours before resubmitting.');
      } else {
        setMessage(error.message || 'Failed to submit application. Please try again.');
      }
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Instructor Registration</h2>
        </div>

        <h3>Join our team</h3>
        <p className="muted">Complete the form below to submit your application.</p>

        <div className="admin-form">
          <div className="admin-field">
            <label>
              Full Name
              {' '}
              <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              placeholder="John Doe"
              aria-invalid={!!errors.name}
            />
            {errors.name && <span className="error-message" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.name}</span>}
          </div>

          <div className="admin-field">
            <label>
              Email Address
              {' '}
              <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              placeholder="john@example.com"
              type="email"
              aria-invalid={!!errors.email}
            />
            {errors.email && <span className="error-message" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.email}</span>}
          </div>

          <div className="admin-field">
            <label>
              Mobile Number
              {' '}
              <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              placeholder="+20 100 000 0000"
              type="tel"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <span className="error-message" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.phone}</span>}
          </div>

          <div className="admin-field">
            <label>
              Specialization / Category
              {' '}
              <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                if (errors.category) setErrors({ ...errors, category: '' });
              }}
              placeholder="Graphic Design"
              aria-invalid={!!errors.category}
            />
            {errors.category && <span className="error-message" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.category}</span>}
          </div>

          <div className="admin-field">
            <label>Courses Taken</label>
            <textarea
              value={coursesTaken}
              onChange={(e) => setCoursesTaken(e.target.value)}
              rows={2}
              placeholder="List any relevant courses or certifications"
            />
          </div>

          <div className="admin-field">
            <label>Years of Experience</label>
            <input
              value={experience}
              onChange={(e) => {
                setExperience(e.target.value);
                if (errors.experience) setErrors({ ...errors, experience: '' });
              }}
              placeholder="2"
              type="number"
              min="0"
              max="100"
              aria-invalid={!!errors.experience}
            />
            {errors.experience && <span className="error-message" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.experience}</span>}
          </div>

          <div className="admin-field">
            <label>Notes / Message</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Tell us about yourself and why you want to become an instructor"
            />
          </div>
        </div>

        <button type="button" className="primary-pill" onClick={handleSubmit} disabled={loading}>
          <span>{loading ? 'Submitting...' : 'Submit Application'}</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
        <p className="muted">
          After submitting, send your CV on WhatsApp so the admin team can review your application.
        </p>
      </div>
      <Toast message={message} type={messageType} onClose={() => setMessage('')} />
    </div>
  );
}
