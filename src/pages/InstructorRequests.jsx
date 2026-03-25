import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import {
  approveInstructorRequest,
  rejectInstructorRequest,
  revokeInstructorRequest,
  subscribeInstructorRequestsByStatus,
} from '../services/instructorRequests.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';

export default function InstructorRequests() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const role = resolveAuthRole(profile, user);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    const unSubPending = subscribeInstructorRequestsByStatus(
      'pending',
      (items) => setPending(items || []),
      () => setPending([])
    );
    const unSubApproved = subscribeInstructorRequestsByStatus(
      'approved',
      (items) => setApproved(items || []),
      () => setApproved([])
    );
    return () => {
      unSubPending();
      unSubApproved();
    };
  }, []);

  const filtered = useMemo(
    () => (tab === 'pending' ? pending : approved),
    [approved, pending, tab]
  );

  const updateStatus = async (request, action) => {
    if (busyId) return;
    const id = `${request?.id || request?.userId || ''}`.trim();
    if (!id) return;
    setBusyId(id);
    try {
      if (action === 'approve') {
        await approveInstructorRequest(request);
        setMessage('Instructor approved.');
      } else if (action === 'reject') {
        await rejectInstructorRequest(request);
        setMessage('Request rejected.');
      } else if (action === 'revoke') {
        await revokeInstructorRequest(request);
        setMessage('Instructor access removed.');
      }
    } catch (error) {
      setMessage(error?.message || 'Failed to update request.');
    } finally {
      setBusyId('');
    }
  };

  if (role !== 'admin') {
    return (
      <div className="app-shell">
        <div className="screen screen--wide empty-state">
          <p>Access denied.</p>
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

        <div className="instructor-tabs">
          <button
            type="button"
            className={tab === 'pending' ? 'active' : ''}
            onClick={() => setTab('pending')}
          >
            Pending
          </button>
          <button
            type="button"
            className={tab === 'approved' ? 'active' : ''}
            onClick={() => setTab('approved')}
          >
            Approved
          </button>
        </div>

        <div className="admin-list">
          {filtered.map((request) => {
            const key = request.id || request.userId;
            const isBusy = busyId === key;
            return (
              <div key={key} className="admin-card">
                <div className="admin-card__body">
                  <strong>{request.name || 'Instructor Candidate'}</strong>
                  <span>{request.email || request.userId}</span>
                  <span>Category: {request.category || 'General'}</span>
                  {request.experienceYears ? (
                    <span>Experience: {request.experienceYears} years</span>
                  ) : null}
                  {request.coursesTaken ? <span>Courses: {request.coursesTaken}</span> : null}
                  {request.notes ? <span>Notes: {request.notes}</span> : null}
                  {request.phone ? <span>Phone: {request.phone}</span> : null}
                </div>
                <div className="admin-card__actions">
                  {tab === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="danger"
                        disabled={isBusy}
                        onClick={() => updateStatus(request, 'reject')}
                      >
                        {isBusy ? 'Updating...' : 'Reject'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateStatus(request, 'approve')}
                      >
                        {isBusy ? 'Updating...' : 'Approve'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="danger"
                      disabled={isBusy}
                      onClick={() => updateStatus(request, 'revoke')}
                    >
                      {isBusy ? 'Updating...' : 'Remove Access'}
                    </button>
                  )}
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
