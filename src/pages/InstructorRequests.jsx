import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import {
  approveInstructorRequest,
  rejectInstructorRequest,
  revokeInstructorRequest,
  subscribeInstructorRequestsByStatus,
  getInstructorRequestStats,
} from '../services/instructorRequests.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

export default function InstructorRequests() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const role = resolveAuthRole(profile, user);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, revoked: 0, total: 0 });
  const [busyId, setBusyId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState('');

  useEffect(() => {
    const unSubPending = subscribeInstructorRequestsByStatus(
      'pending',
      (items) => setPending(items || []),
      (error) => {
        console.error('Error loading pending:', error);
        setPending([]);
      }
    );
    const unSubApproved = subscribeInstructorRequestsByStatus(
      'approved',
      (items) => setApproved(items || []),
      (error) => {
        console.error('Error loading approved:', error);
        setApproved([]);
      }
    );
    const unSubRejected = subscribeInstructorRequestsByStatus(
      'rejected',
      (items) => setRejected(items || []),
      (error) => {
        console.error('Error loading rejected:', error);
        setRejected([]);
      }
    );

    // Load stats
    const loadStats = async () => {
      try {
        const newStats = await getInstructorRequestStats();
        setStats(newStats);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
    const statsInterval = setInterval(loadStats, 30000); // Every 30 seconds

    return () => {
      unSubPending();
      unSubApproved();
      unSubRejected();
      clearInterval(statsInterval);
    };
  }, []);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'pending':
        return pending;
      case 'approved':
        return approved;
      case 'rejected':
        return rejected;
      default:
        return [];
    }
  }, [approved, pending, rejected, tab]);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
  };

  const updateStatus = async (request, action, reason = '') => {
    if (busyId) return;
    const id = `${request?.id || request?.userId || ''}`.trim();
    if (!id) return;
    setBusyId(id);
    try {
      if (action === 'approve') {
        await approveInstructorRequest(request);
        showMessage('✅ Instructor approved successfully!', 'success');
      } else if (action === 'reject') {
        await rejectInstructorRequest(request, reason);
        showMessage('✅ Request rejected.', 'success');
        setShowRejectModal('');
        setRejectionReason('');
      } else if (action === 'revoke') {
        await revokeInstructorRequest(request);
        showMessage('✅ Instructor access removed.', 'success');
      }
    } catch (error) {
      const errorMsg = error?.message || 'Failed to update request.';
      showMessage(`❌ ${errorMsg}`, 'error');
    } finally {
      setBusyId('');
    }
  };

  if (role !== 'admin') {
    return (
      <div className="app-shell">
        <div className="screen screen--wide empty-state">
          <p>🔒 Access denied. Admin only.</p>
          <button type="button" className="primary-pill" onClick={() => navigate(-1)}>
            <span>Back</span>
            <span className="primary-pill__arrow">&gt;</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Instructor Requests</h2>
        </div>

        {/* Stats Summary */}
        <div className="stats-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#f0f0f0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{stats.pending}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Pending</div>
          </div>
          <div style={{ background: '#f0f0f0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{stats.approved}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Approved</div>
          </div>
          <div style={{ background: '#f0f0f0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>{stats.rejected}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Rejected</div>
          </div>
          <div style={{ background: '#f0f0f0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="instructor-tabs">
          {['pending', 'approved', 'rejected'].map((tabName) => (
            <button
              key={tabName}
              type="button"
              className={tab === tabName ? 'active' : ''}
              onClick={() => setTab(tabName)}
            >
              {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="admin-list">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <p>📭 No {tab} instructor requests</p>
            </div>
          ) : (
            filtered.map((request) => {
              const key = request.id || request.userId;
              const isBusy = busyId === key;
              return (
                <div key={key} className="admin-card">
                  <div className="admin-card__body">
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '16px' }}>👤 {request.name || 'Instructor Candidate'}</strong>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                      📧 {request.email || request.userId}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      📚 <strong>Category:</strong> {request.category || 'General'}
                    </div>
                    {request.phone && (
                      <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                        📱 <strong>Phone:</strong> {request.phone}
                      </div>
                    )}
                    {request.experienceYears ? (
                      <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                        ⏱️ <strong>Experience:</strong> {request.experienceYears} years
                      </div>
                    ) : null}
                    {request.coursesTaken && (
                      <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                        🎓 <strong>Courses:</strong> {request.coursesTaken}
                      </div>
                    )}
                    {request.notes && (
                      <div style={{ fontSize: '13px', color: '#555', marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                        <strong>📝 Notes:</strong> {request.notes}
                      </div>
                    )}
                    {request.rejectionReason && (
                      <div style={{ fontSize: '13px', color: '#d32f2f', marginTop: '8px', padding: '8px', background: '#ffebee', borderRadius: '4px' }}>
                        <strong>❌ Reason:</strong> {request.rejectionReason}
                      </div>
                    )}
                  </div>
                  <div className="admin-card__actions">
                    {tab === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="danger"
                          disabled={isBusy}
                          onClick={() => setShowRejectModal(key)}
                        >
                          {isBusy ? '⏳ ...' : '❌ Reject'}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => updateStatus(request, 'approve')}
                          style={{ background: '#4caf50', color: 'white' }}
                        >
                          {isBusy ? '⏳ ...' : '✅ Approve'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="danger"
                        disabled={isBusy}
                        onClick={() => updateStatus(request, 'revoke')}
                      >
                        {isBusy ? '⏳ ...' : '🚫 Remove Access'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
            }}>
              <h3 style={{ marginTop: 0 }}>❌ Reject Request</h3>
              <p style={{ color: '#666' }}>Provide a reason for rejection (optional):</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Missing required qualifications, Incomplete profile, etc."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal('');
                    setRejectionReason('');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const request = filtered.find((r) => (r.id || r.userId) === showRejectModal);
                    if (request) {
                      updateStatus(request, 'reject', rejectionReason);
                    }
                  }}
                  disabled={busyId === showRejectModal}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#f44336',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {busyId === showRejectModal ? '⏳ Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Toast
        message={message}
        type={messageType}
        onClose={() => setMessage('')}
      />
    </div>
  );
}
