import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import { getAllTransactions, subscribeTransactions } from '../services/transactions.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

const STATUS_COLORS = {
  paid: '#1F7C64',
  waiting: '#E2702B',
  rejected: '#E74C3C',
};

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month} ${day}, ${year} / ${hour}:${minute}`;
};

const buildBarcode = (transaction) => {
  const left = `${transaction?.barcodeLeft || ''}`.trim();
  const right = `${transaction?.barcodeRight || ''}`.trim();
  if (left && right) return [left, right];
  const digits = `${transaction?.id || ''}`.replace(/\D/g, '').padEnd(16, '0');
  return [digits.slice(0, 8), digits.slice(8, 16)];
};

export default function Receipt() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();
  const role = resolveAuthRole(profile, user) || 'student';
  const [message, setMessage] = useState('');
  const [allTransactions, setAllTransactions] = useState(() => getAllTransactions());

  const transactionId = location.state?.transactionId;

  useEffect(() => {
    const unsubscribe = subscribeTransactions(
      {
        role,
        userId: user?.uid || '',
        mentorId: user?.uid || '',
      },
      (items) => setAllTransactions(items),
      () => setAllTransactions(getAllTransactions())
    );
    return unsubscribe;
  }, [role, user?.uid]);

  const transaction = useMemo(() => {
    if (transactionId) {
      return allTransactions.find((item) => item.id === transactionId) || allTransactions[0];
    }
    return allTransactions[0];
  }, [allTransactions, transactionId]);

  if (!transaction) {
    return (
      <div className="app-shell">
        <div className="screen screen--wide empty-state">
          <p>No receipt data.</p>
          <button type="button" className="primary-pill" onClick={() => navigate(-1)}>
            <span>Back</span>
            <span className="primary-pill__arrow">&gt;</span>
          </button>
        </div>
      </div>
    );
  }

  const [leftCode, rightCode] = buildBarcode(transaction);
  const statusColor = STATUS_COLORS[transaction.status] || STATUS_COLORS.waiting;
  const receiptCode = transaction.receiptCode || transaction.id;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptCode);
      setMessage('Copied to clipboard.');
    } catch {
      setMessage('Copy failed.');
    }
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>E-Receipt</h2>
        </div>

        <div className="receipt-card">
          <img src="/assets/e_receipt/ICON.svg" alt="Receipt" className="receipt-icon" />
          <img src="/assets/e_receipt/BAR%20CODE.svg" alt="Barcode" className="receipt-barcode" />
          <div className="receipt-code">
            <span>{leftCode}</span>
            <span>{rightCode}</span>
          </div>

          <div className="receipt-row">
            <span>Name</span>
            <strong>{transaction.userName || 'Student'}</strong>
          </div>
          <div className="receipt-row">
            <span>Email ID</span>
            <strong>{transaction.userEmail || 'user@levelup.app'}</strong>
          </div>
          <div className="receipt-row">
            <span>Course</span>
            <strong>{transaction.courseTitle}</strong>
          </div>
          <div className="receipt-row">
            <span>Category</span>
            <strong>{transaction.courseCategory}</strong>
          </div>
          <div className="receipt-row">
            <span>Transaction ID</span>
            <button type="button" className="copy-button" onClick={handleCopy}>
              {receiptCode}
            </button>
          </div>
          <div className="receipt-row">
            <span>Price</span>
            <strong>{transaction.priceLabel}</strong>
          </div>
          <div className="receipt-row">
            <span>Date</span>
            <strong>{formatDate(transaction.updatedAt || transaction.createdAt)}</strong>
          </div>
          <div className="receipt-row">
            <span>Status</span>
            <span className="status-pill" style={{ background: statusColor }}>
              {transaction.status}
            </span>
          </div>
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
