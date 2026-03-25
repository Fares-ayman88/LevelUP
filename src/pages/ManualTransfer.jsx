import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { addTransaction } from '../services/transactions.js';
import { useAuth } from '../state/auth.jsx';

const FALLBACK = {
  course: {
    id: 'course_fallback',
    category: 'Graphic Design',
    title: 'Graphic Design Advanced',
    coverImagePath: '',
  },
  paymentMethod: 'InstaPay',
  totalLabel: 'EGP 1450',
};

const WALLET_INFO = {
  instapay: {
    number: '01148822933',
    name: 'Ahmed S A M',
  },
  vodafone: {
    number: '01055117991',
    name: 'Ahmed S A M',
  },
};

export default function ManualTransfer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [sender, setSender] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const payload = location.state || FALLBACK;
  const course = payload.course || FALLBACK.course;
  const method = payload.paymentMethod || FALLBACK.paymentMethod;
  const totalLabel = payload.totalLabel || FALLBACK.totalLabel;

  const key = method.toLowerCase().includes('insta') ? 'instapay' : 'vodafone';
  const wallet = WALLET_INFO[key];

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachment(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!sender.trim()) {
      setMessage('Enter sender number.');
      return;
    }
    if (!attachment) {
      setMessage('Attach transfer screenshot.');
      return;
    }
    setLoading(true);

    const transaction = await addTransaction({
      courseId: course.id,
      courseTitle: course.title,
      courseCategory: course.category,
      priceLabel: totalLabel,
      coverImage: course.coverImagePath,
      courseCoverImagePath: course.coverImagePath,
      mentorName: course.mentorName,
      mentorId: course.mentorId,
      paymentMethod: method,
      senderNumber: sender.trim(),
      attachmentName: attachment.name,
      userName: profile?.name || 'Student',
      userEmail: profile?.email || 'user@levelup.app',
    });

    localStorage.setItem(`levelup_enrolled_${course.id}`, '1');

    setLoading(false);
    navigate('/receipt', { state: { transactionId: transaction.id } });
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Manual Transfer</h2>
        </div>

        <div className="transfer-card">
          <span>Send the amount to</span>
          <h3>{wallet.number}</h3>
          <p>{wallet.name}</p>
          <div className="transfer-row">
            <span>{method}</span>
            <strong>{totalLabel}</strong>
          </div>
        </div>

        <label className="form-label" htmlFor="sender-number">Sender Number</label>
        <input
          id="sender-number"
          className="form-input"
          placeholder="01xxxxxxxxx"
          value={sender}
          onChange={(event) => setSender(event.target.value)}
        />

        <label className="form-label" htmlFor="transfer-attachment">Transfer Screenshot</label>
        <div className="upload-box">
          {preview ? <img src={preview} alt="Attachment" /> : <span>Upload attachment</span>}
          <input id="transfer-attachment" type="file" accept="image/*" onChange={onFileChange} />
        </div>

        <button type="button" className="primary-button" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Transfer'}
        </button>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
