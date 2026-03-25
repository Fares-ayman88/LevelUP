import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { addStoredCard } from '../services/cards.js';

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export default function AddNewCard() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [message, setMessage] = useState('');

  const previewNumber = number || '1234 5678 8765 0876';
  const previewName = (name || 'TIMMY C HERNANDEZ').toUpperCase();
  const previewExpiry = expiry || '12/28';

  const last4 = useMemo(() => number.replace(/\D/g, '').slice(-4), [number]);

  const handleSave = () => {
    if (!name.trim() || last4.length < 4) {
      setMessage('Please enter valid card details.');
      return;
    }
    addStoredCard({
      id: `card_${Date.now()}`,
      holderName: name.trim(),
      last4,
      expiry: expiry.trim(),
      maskedNumber: `**** **** **** ${last4}`,
    });
    navigate('/payment-option');
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Add New Card</h2>
        </div>

        <div className="card-preview">
          <div className="card-chip" />
          <div className="card-number">{previewNumber}</div>
          <div className="card-footer">
            <div>
              <small>VALID</small>
              <small>THRU</small>
            </div>
            <strong>{previewExpiry}</strong>
          </div>
          <div className="card-name">{previewName}</div>
        </div>

        <label className="form-label" htmlFor="card-name">Card Name</label>
        <input
          id="card-name"
          className="form-input"
          placeholder="Belinda C Cullen"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label className="form-label" htmlFor="card-number">Card Number</label>
        <input
          id="card-number"
          className="form-input"
          placeholder="**** **** **** 3054"
          value={number}
          onChange={(event) => setNumber(formatCardNumber(event.target.value))}
        />

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="card-expiry">Expiry Date</label>
            <input
              id="card-expiry"
              className="form-input"
              placeholder="12/28"
              value={expiry}
              onChange={(event) => setExpiry(formatExpiry(event.target.value))}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="card-cvv">CVV</label>
            <input
              id="card-cvv"
              className="form-input"
              placeholder="***"
              value={cvv}
              onChange={(event) => setCvv(event.target.value.replace(/\D/g, '').slice(0, 3))}
            />
          </div>
        </div>

        <button type="button" className="primary-pill" onClick={handleSave}>
          <span>Add New Card</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
