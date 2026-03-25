import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { addTransaction } from '../services/transactions.js';
import { useAuth } from '../state/auth.jsx';

const METHODS = [
  {
    label: 'InstaPay',
    asset: '/assets/payment/instapay_logo.jpg',
    hasFee: true,
    requiresManual: true,
    color: '#1E6BFF',
  },
  {
    label: 'Vodafone Cash',
    asset: '/assets/payment/vodafone_cash.png',
    hasFee: true,
    requiresManual: true,
    color: '#E01E2D',
  },
];

const FALLBACK_COURSE = {
  id: 'course_fallback',
  category: 'Graphic Design',
  title: 'Graphic Design Advanced',
  mentorName: 'Sonja Carter',
  mentorSubtitle: 'Graphic Design Mentor',
  coverImagePath: '',
  price: 'EGP 1450',
  rating: '4.2',
  classes: 21,
  hours: 42,
};

const parsePrice = (value) => {
  const match = `${value}`.match(/[\d.]+/g);
  if (!match) return 0;
  const number = Number.parseFloat(match[0]);
  return Number.isFinite(number) ? number : 0;
};

const formatEgp = (value) => `EGP ${Math.round(value)}`;

export default function PaymentMethods() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const course = useMemo(() => location.state?.course || FALLBACK_COURSE, [location.state]);
  const basePrice = parsePrice(course.price);
  const selectedMethod = METHODS[selectedIndex] || METHODS[0];
  const fees = selectedMethod.hasFee ? Math.round(basePrice * 0.05) : 0;
  const total = basePrice + fees;

  const handleEnroll = async () => {
    const method = METHODS[selectedIndex];
    if (!method) return;
    const totalLabel = formatEgp(total);

    if (method.requiresManual) {
      navigate('/manual-transfer', {
        state: {
          course,
          paymentMethod: method.label,
          totalLabel,
        },
      });
      return;
    }

    const transaction = await addTransaction({
      courseId: course.id,
      courseTitle: course.title,
      courseCategory: course.category,
      priceLabel: totalLabel,
      coverImage: course.coverImagePath,
      courseCoverImagePath: course.coverImagePath,
      mentorName: course.mentorName,
      mentorId: course.mentorId,
      paymentMethod: method.label,
      userName: profile?.name || 'Student',
      userEmail: profile?.email || 'user@levelup.app',
    });

    localStorage.setItem(`levelup_enrolled_${course.id}`, '1');

    navigate('/receipt', { state: { transactionId: transaction.id } });
  };

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Payment Methods</h2>
        </div>

        <div className="payment-course">
          <div className="payment-course__image">
            {course.coverImagePath ? <img src={course.coverImagePath} alt={course.title} /> : null}
          </div>
          <div>
            <div className="course-list-category">{course.category}</div>
            <div className="course-list-title">{course.title}</div>
          </div>
        </div>

        <p className="muted">Select the payment method you want to use</p>

        <div className="payment-methods">
          {METHODS.map((method, index) => (
            <button
              key={method.label}
              type="button"
              className={`payment-method ${index === selectedIndex ? 'active' : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <span className="payment-method__badge" style={{ borderColor: method.color }}>
                <img src={method.asset} alt={method.label} />
              </span>
              <span className="payment-method__label">{method.label}</span>
              <span className={`payment-method__dot ${index === selectedIndex ? 'active' : ''}`} />
            </button>
          ))}
        </div>

        <div className="payment-summary">
          <div>
            <span>Fees</span>
            <strong>{formatEgp(fees)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatEgp(total)}</strong>
          </div>
        </div>
      </div>

      <div className="enroll-bar">
        <button type="button" onClick={handleEnroll}>
          Enroll Course - {formatEgp(basePrice)}
        </button>
      </div>
    </div>
  );
}
