import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import {
  getAllTransactions,
  subscribeAdminTransactions,
  updateTransactionStatus,
} from '../services/transactions.js';

const STATUS_COLORS = {
  paid: '#1F7C64',
  waiting: '#E2702B',
  rejected: '#E74C3C',
};

const resolveDate = (item) => new Date(item.updatedAt || item.createdAt || Date.now());

const inRange = (date, start, end) => date >= start && date <= end;

export default function AdminTransactions() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busyId, setBusyId] = useState('');
  const [transactions, setTransactions] = useState(() => getAllTransactions());

  useEffect(() => {
    const unsubscribe = subscribeAdminTransactions(
      (items) =>
        setTransactions(
          (items || []).slice().sort((a, b) => resolveDate(b) - resolveDate(a))
        ),
      () =>
        setTransactions(
          getAllTransactions().sort((a, b) => resolveDate(b) - resolveDate(a))
        )
    );
    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filter === 'today') {
      const end = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      return transactions.filter((item) => inRange(resolveDate(item), startOfDay, end));
    }
    if (filter === 'last7') {
      const start = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);
      const end = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      return transactions.filter((item) => inRange(resolveDate(item), start, end));
    }
    if (filter === 'last30') {
      const start = new Date(startOfDay.getTime() - 29 * 24 * 60 * 60 * 1000);
      const end = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      return transactions.filter((item) => inRange(resolveDate(item), start, end));
    }
    if (filter === 'custom' && fromDate && toDate) {
      const start = new Date(`${fromDate}T00:00:00`);
      const end = new Date(`${toDate}T23:59:59`);
      return transactions.filter((item) => inRange(resolveDate(item), start, end));
    }
    return transactions;
  }, [filter, fromDate, toDate, transactions]);

  const updateStatus = async (item, status) => {
    const id = `${item?.id || ''}`.trim();
    if (!id || busyId) return;
    setBusyId(id);
    try {
      await updateTransactionStatus(item.id, status);
      setMessage(status === 'paid' ? 'Payment approved.' : 'Payment rejected.');
    } catch (error) {
      setMessage(error?.message || 'Could not update payment.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Recent Transactions</h2>
        </div>

        <div className="admin-filter-card">
          <div className="admin-filter-header">
            <div>
              <strong>{filter === 'custom' ? 'Custom range' : filter.toUpperCase()}</strong>
              <span>{filtered.length} transactions</span>
            </div>
            <div className="admin-date-range">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" onClick={() => setFilter('custom')}>Apply</button>
            </div>
          </div>
          <div className="admin-chip-row">
            <button type="button" className={`admin-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button type="button" className={`admin-chip ${filter === 'today' ? 'active' : ''}`} onClick={() => setFilter('today')}>Today</button>
            <button type="button" className={`admin-chip ${filter === 'last7' ? 'active' : ''}`} onClick={() => setFilter('last7')}>Last 7 days</button>
            <button type="button" className={`admin-chip ${filter === 'last30' ? 'active' : ''}`} onClick={() => setFilter('last30')}>Last 30 days</button>
          </div>
        </div>

        <div className="admin-list">
          {filtered.map((item) => {
            const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.waiting;
            const isBusy = busyId === item.id;
            return (
              <div key={item.id} className="admin-card">
                <div className="admin-card__body">
                  <strong>{item.courseTitle}</strong>
                  <span>{item.userName || item.userEmail}</span>
                  <span>{item.courseCategory}</span>
                  <span>{item.priceLabel}</span>
                </div>
                <div className="admin-card__status" style={{ color: statusColor }}>
                  {item.status}
                </div>
                <div className="admin-card__actions">
                  {item.status === 'waiting' ? (
                    <>
                      <button type="button" disabled={isBusy} onClick={() => updateStatus(item, 'paid')}>
                        {isBusy ? 'Updating...' : 'Accept'}
                      </button>
                      <button type="button" className="danger" disabled={isBusy} onClick={() => updateStatus(item, 'rejected')}>
                        {isBusy ? 'Updating...' : 'Reject'}
                      </button>
                    </>
                  ) : item.status === 'paid' ? (
                    <button type="button" className="danger" disabled={isBusy} onClick={() => updateStatus(item, 'rejected')}>
                      {isBusy ? 'Updating...' : 'Remove Access'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
