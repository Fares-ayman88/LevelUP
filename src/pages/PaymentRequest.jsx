import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import {
  getAllTransactions,
  subscribeTransactions,
  updateTransactionStatus,
} from '../services/transactions.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

export default function PaymentRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();
  const role = resolveAuthRole(profile, user) || 'student';
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState(() => getAllTransactions());

  const transactionId = location.state?.transactionId || '';

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

  const transaction = useMemo(
    () => (transactionId ? allTransactions.find((item) => item.id === transactionId) || null : null),
    [allTransactions, transactionId]
  );

  const handleUpdate = async (status) => {
    if (!transaction || loading) return;
    setLoading(true);
    try {
      await updateTransactionStatus(transaction.id, status);
      setMessage(status === 'paid' ? 'Payment approved.' : 'Payment rejected.');
      navigate(-1);
    } catch (error) {
      setMessage(error?.message || 'Could not update payment.');
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) {
    return (
      <div className="app-shell">
        <div className="screen screen--wide empty-state">
          <p>Request not found.</p>
          <button type="button" className="primary-pill" onClick={() => navigate(-1)}>
            <span>Back</span>
            <span className="primary-pill__arrow">&gt;</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Payment Request</h2>
        </div>

        <div className="info-card">
          <h4>{transaction.courseTitle}</h4>
          <span>{transaction.courseCategory}</span>
          <div className="info-grid">
            <div>
              <small>Amount</small>
              <strong>{transaction.priceLabel}</strong>
            </div>
            <div>
              <small>User</small>
              <strong>{transaction.userName || transaction.userEmail || 'Student'}</strong>
            </div>
            <div>
              <small>Method</small>
              <strong>{transaction.paymentMethod || 'Manual'}</strong>
            </div>
            <div>
              <small>Status</small>
              <strong>{transaction.status}</strong>
            </div>
          </div>
        </div>

        <div className="upload-box upload-box--preview">
          <span>
            {transaction.attachmentName || transaction.attachmentPath || 'No attachment provided.'}
          </span>
        </div>

        {transaction.status === 'waiting' ? (
          <div className="action-row">
            <button type="button" className="danger-button" disabled={loading} onClick={() => handleUpdate('rejected')}>
              {loading ? 'Updating...' : 'Reject'}
            </button>
            <button type="button" className="success-button" disabled={loading} onClick={() => handleUpdate('paid')}>
              {loading ? 'Updating...' : 'Accept'}
            </button>
          </div>
        ) : null}
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
