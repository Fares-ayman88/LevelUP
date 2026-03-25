import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../state/auth.jsx';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const formatDate = (value) => {
  const date = value || new Date();
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export default function Certificate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const data = useMemo(() => {
    const state = location.state || {};
    return {
      courseTitle: state.courseTitle || '3D Design Illustration',
      certificateId: state.certificateId || 'SK24568086',
      userName: state.userName || profile?.name || 'Student',
    };
  }, [location.state, profile]);

  const issuedOn = formatDate(new Date());

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>{data.courseTitle}</h2>
        </div>

        <div className="search-ghost">
          <span>{data.courseTitle}</span>
          <span className="search-ghost__icon">
            <img src="/assets/my_courses/search.svg" alt="Search" />
          </span>
        </div>

        <div className="certificate-card">
          <img src="/assets/certificate/blue.svg" alt="" className="certificate-shape certificate-shape--top" />
          <img src="/assets/certificate/orange.svg" alt="" className="certificate-shape certificate-shape--bottom" />
          <img src="/assets/certificate_logo_circle.png" alt="" className="certificate-watermark" />

          <img src="/assets/certificate_logo_circle.png" alt="Logo" className="certificate-logo" />
          <h3>Certificate of Completion</h3>
          <p>This certifies that</p>
          <h4>{data.userName}</h4>
          <p>Has Successfully Completed the Wallace Training Program, Entitled.</p>
          <h5>{data.courseTitle} Course</h5>
          <span>Issued on {issuedOn}</span>
          <div className="certificate-id">ID: {data.certificateId}</div>
          <div className="certificate-signature">
            <img src="/assets/certificate/signature.png" alt="Signature" />
            <div className="certificate-line" />
            <strong>Level Up Team Work</strong>
            <span>Issued on {issuedOn}</span>
          </div>
        </div>
      </div>

      <div className="course-footer">
        <button type="button" className="primary-pill" onClick={() => {}}>
          <span>Download Certificate</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
      </div>
    </div>
  );
}
