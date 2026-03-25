import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getAllTransactions,
  subscribeMentorTransactions,
} from '../services/transactions.js';
import { useAuth } from '../state/auth.jsx';

const STATUS_COLORS = {
  paid: '#1F7C64',
  waiting: '#E2702B',
  rejected: '#E74C3C',
};

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

export default function MentorTransactions() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState(() => getAllTransactions());

  useEffect(() => {
    const mentorId = user?.uid || '';
    if (!mentorId) {
      setTransactions(getAllTransactions());
      return () => {};
    }
    const unsubscribe = subscribeMentorTransactions(
      mentorId,
      (items) => setTransactions(items || []),
      () => setTransactions(getAllTransactions())
    );
    return unsubscribe;
  }, [user?.uid]);

  const items = useMemo(() => {
    if (!profile) return [];
    return transactions.filter((item) => {
      if (item.mentorId && user?.uid && item.mentorId === user.uid) return true;
      if (item.mentorName && profile.name && item.mentorName === profile.name) return true;
      return false;
    });
  }, [profile, transactions, user?.uid]);

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Recent Payments</h2>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <p>No payments yet.</p>
          </div>
        ) : (
          <div className="admin-list">
            {items.map((item) => (
              <div key={item.id} className="admin-card">
                <div className="admin-card__body">
                  <strong>{item.courseTitle}</strong>
                  <span>{item.userName || item.userEmail}</span>
                  <span>{item.courseCategory}</span>
                  <span>{item.priceLabel}</span>
                  <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                </div>
                <div className="admin-card__status" style={{ color: STATUS_COLORS[item.status] || STATUS_COLORS.waiting }}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
