import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import './Cart.css';

export default function Cart() {
  const navigate = useNavigate();

  return (
    <div className="home-screen cart-page">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>
              arrow_back
            </span>
          </button>
          <h2>Cart</h2>
        </div>

        <section className="cart-empty" aria-labelledby="cart-empty-title">
          <div className="cart-empty__icon" aria-hidden>
            <span className="material-icons-round">shopping_cart</span>
          </div>
          <div className="cart-empty__content">
            <h3 id="cart-empty-title">Your cart is empty</h3>
            <p>Courses you add before checkout will appear here.</p>
          </div>
          <div className="cart-empty__actions">
            <button
              type="button"
              className="cart-empty__primary"
              onClick={() => navigate('/popular-courses')}
            >
              <span>Explore Courses</span>
              <span className="material-icons-round" aria-hidden>
                arrow_forward
              </span>
            </button>
            <button
              type="button"
              className="cart-empty__secondary"
              onClick={() => navigate('/saved-courses')}
            >
              Saved Courses
            </button>
          </div>
        </section>
      </div>
      <MainBottomNav currentIndex={-1} />
    </div>
  );
}
