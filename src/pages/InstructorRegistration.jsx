import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { submitInstructorRequest } from '../services/instructorRequests.js';
import { useAuth } from '../state/auth.jsx';

export default function InstructorRegistration() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [coursesTaken, setCoursesTaken] = useState('');
  const [experience, setExperience] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (loading) return;
    if (!user?.uid) {
      setMessage('Please sign in first.');
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim() || !category.trim()) {
      setMessage('Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const request = await submitInstructorRequest({
        user,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        category: category.trim(),
        coursesTaken: coursesTaken.trim(),
        experienceYears: experience.trim(),
        notes: notes.trim(),
      });
      navigate('/instructor-documents', { state: request || {} });
    } catch (error) {
      setMessage(error?.message || 'Failed to submit request.');
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
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="admin-field">
            <label>Email Address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="admin-field">
            <label>Mobile Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20 100 000 0000" />
          </div>
          <div className="admin-field">
            <label>Specialization / Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Graphic Design" />
          </div>
          <div className="admin-field">
            <label>Courses Taken</label>
            <textarea value={coursesTaken} onChange={(e) => setCoursesTaken(e.target.value)} rows={2} />
          </div>
          <div className="admin-field">
            <label>Years of Experience</label>
            <input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="2" />
          </div>
          <div className="admin-field">
            <label>Notes / Message</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <button type="button" className="primary-pill" onClick={handleSubmit} disabled={loading}>
          <span>{loading ? 'Submitting...' : 'Submit Application'}</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
        <p className="muted">By submitting, you agree to our Instructor Terms.</p>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
