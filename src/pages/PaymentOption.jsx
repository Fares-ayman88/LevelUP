import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getStoredCards } from '../services/cards.js';

const PROVIDERS = [
  { asset: '/assets/payment/instapay_logo.jpg' },
  { asset: '/assets/payment/vodafone_cash.png' },
];

export default function PaymentOption() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);

  useEffect(() => {
    setCards(getStoredCards());
  }, []);

  return (
    <div className="app-shell">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Payment Option</h2>
        </div>

        <div className="payment-options">
          {PROVIDERS.map((provider, index) => (
            <div key={`provider-${index}`} className="payment-option-row">
              <div className="payment-option-badge">
                <img src={provider.asset} alt="Provider" />
              </div>
              <span>Connected</span>
            </div>
          ))}

          {cards.length === 0 ? (
            <div className="payment-option-row">
              <div className="payment-option-badge">
                <span>Card</span>
              </div>
              <span>**** **** **76 3054</span>
            </div>
          ) : (
            cards.map((card) => (
              <div key={card.id} className="payment-option-row">
                <div className="payment-option-badge">
                  <span>Card</span>
                </div>
                <span>{card.maskedNumber}</span>
              </div>
            ))
          )}
        </div>

        <button type="button" className="primary-pill" onClick={() => navigate('/add-new-card')}>
          <span>Add New Card</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
      </div>
    </div>
  );
}
