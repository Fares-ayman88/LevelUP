import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import {
  getAllTransactions,
  subscribeUserTransactions,
} from '../services/transactions.js';
import { useAuth } from '../state/auth.jsx';

const STATUS = {
  paid: { label: 'Paid', color: '#1F7C64' },
  waiting: { label: 'Waiting', color: '#E2702B' },
  rejected: { label: 'Rejected', color: '#E74C3C' },
};

export default function Transactions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState(() => getAllTransactions());

  useEffect(() => {
    if (!user?.uid) {
      setItems(getAllTransactions());
      return () => {};
    }
    const unsubscribe = subscribeUserTransactions(
      user.uid,
      (list) => setItems(list),
      () => setItems(getAllTransactions())
    );
    return unsubscribe;
  }, [user?.uid]);

  return (
    <div className="home-screen">
      <div className="screen">
        <div className="mycourses-header">
          <button type="button" className="circle-btn" onClick={() => navigate(-1)}>
            <span style={{ fontWeight: 700 }}>&lt;</span>
          </button>
          <h3>Transactions</h3>
          <button type="button" className="circle-btn">
            <span style={{ fontWeight: 700 }}>S</span>
          </button>
        </div>

        <div className="transactions-list">
          {items.map((item) => {
            const status = STATUS[item.status] || STATUS.waiting;
            return (
              <div
                key={item.id}
                className="transaction-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate('/receipt', { state: { transactionId: item.id } })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    navigate('/receipt', { state: { transactionId: item.id } });
                  }
                }}
              >
                <div className="transaction-card__image">
                  {item.coverImage || item.courseCoverImagePath ? (
                    <img src={item.coverImage || item.courseCoverImagePath} alt={item.courseTitle} />
                  ) : null}
                </div>
                <div className="transaction-card__body">
                  <div className="transaction-card__title">{item.courseTitle}</div>
                  <div className="transaction-card__subtitle">{item.courseCategory}</div>
                  <div className="transaction-card__badge" style={{ color: status.color }}>
                    <span className="badge-dot" style={{ background: status.color }} />
                    {status.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <MainBottomNav currentIndex={3} />
    </div>
  );
}
