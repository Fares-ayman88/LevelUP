import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { label: '3D Design', asset: '/assets/onboarding/rafiki3.png' },
  { label: 'Graphic Design', asset: '/assets/onboarding/rafiki2.png' },
  { label: 'SEO & Marketing', asset: '/assets/onboarding/rafiki.png' },
  { label: 'Finance & Accounting', asset: '/assets/lets_you_in/rafiki.png' },
  { label: 'Personal Development', asset: '/assets/onboarding/rafiki3.png' },
  { label: 'Office Productivity', asset: '/assets/onboarding/rafiki2.png' },
  { label: 'HR Management', asset: '/assets/onboarding/rafiki.png' },
  { label: 'Programming', asset: '/assets/onboarding/rafiki3.png' },
  { label: 'Web Development', asset: '/assets/lets_you_in/rafiki.png' },
  { label: 'Arts & Humanities', asset: '/assets/onboarding/rafiki2.png' },
  { label: 'Business', asset: '/assets/onboarding/rafiki.png' },
  { label: 'Photography', asset: '/assets/onboarding/rafiki3.png' },
];

export default function AllCategory() {
  const navigate = useNavigate();

  return (
    <div className="home-screen home-screen--no-nav">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round" aria-hidden>
              arrow_back
            </span>
          </button>
          <h2>All Category</h2>
        </div>
        <div
          className="category-search"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/search-results')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/search-results');
            }
          }}
        >
          <span>Search for..</span>
          <span className="category-search__icon">
            <img src="/assets/home/Fill%201.svg" alt="Search" />
          </span>
        </div>
        <div className="category-grid">
          {CATEGORIES.map((item) => (
            <div key={item.label} className="category-card">
              <img src={item.asset} alt={item.label} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
