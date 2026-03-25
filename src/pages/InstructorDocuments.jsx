import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';

const CONTACTS = [
  { title: 'Admin WhatsApp 1', phone: '+201148822933', subtitle: 'CV, certificates, ID photo' },
  { title: 'Admin WhatsApp 2', phone: '+201094300987', subtitle: 'CV, certificates, ID photo' },
];

const sanitizePhone = (value = '') => value.replace(/\D/g, '');

const buildMessage = (data) => {
  const lines = [
    'Instructor application documents',
    `Name: ${data.name || '-'}`,
    `Email: ${data.email || '-'}`,
    `Phone: ${data.phone || '-'}`,
    `Category: ${data.category || '-'}`,
  ];
  if (data.experienceYears) lines.push(`Experience: ${data.experienceYears} years`);
  if (data.coursesTaken) lines.push(`Courses: ${data.coursesTaken}`);
  if (data.notes) lines.push(`Notes: ${data.notes}`);
  lines.push('Attached: CV, certificates, ID photo.');
  return lines.join('\n');
};

export default function InstructorDocuments() {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState('');

  const data = useMemo(() => {
    return location.state || {
      name: '',
      email: '',
      phone: '',
      category: '',
      coursesTaken: '',
      experienceYears: '',
      notes: '',
    };
  }, [location.state]);

  const handleOpen = (contact) => {
    const phone = sanitizePhone(contact.phone);
    if (!phone) {
      setMessage('WhatsApp number is not configured.');
      return;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(data))}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Submit Documents</h2>
        </div>

        <h3>Send your documents via WhatsApp</h3>
        <p className="muted">
          Please send your CV, certificates, and a clear ID photo. You can include extra info about your
          courses or experience.
        </p>

        <div className="summary-card">
          <strong>Application Summary</strong>
          <div className="summary-row"><span>Name:</span><span>{data.name || '-'}</span></div>
          <div className="summary-row"><span>Email:</span><span>{data.email || '-'}</span></div>
          <div className="summary-row"><span>Phone:</span><span>{data.phone || '-'}</span></div>
          <div className="summary-row"><span>Category:</span><span>{data.category || '-'}</span></div>
          {data.experienceYears ? (
            <div className="summary-row"><span>Experience:</span><span>{data.experienceYears} years</span></div>
          ) : null}
          {data.coursesTaken ? (
            <div className="summary-row"><span>Courses:</span><span>{data.coursesTaken}</span></div>
          ) : null}
          {data.notes ? (
            <div className="summary-row"><span>Notes:</span><span>{data.notes}</span></div>
          ) : null}
        </div>

        <h4>WhatsApp Contacts</h4>
        <div className="admin-list">
          {CONTACTS.map((contact) => (
            <div key={contact.phone} className="whatsapp-card">
              <div>
                <strong>{contact.title}</strong>
                <span>{contact.phone}</span>
                <span>{contact.subtitle}</span>
              </div>
              <button type="button" onClick={() => handleOpen(contact)}>Open</button>
            </div>
          ))}
        </div>
        <p className="muted">Tip: If WhatsApp does not open, copy the phone number and send manually.</p>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
