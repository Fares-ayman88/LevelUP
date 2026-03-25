import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import { fetchMentors } from '../services/homeData.js';

export default function TopMentors() {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState([]);

  useEffect(() => {
    fetchMentors().then(setMentors).catch(() => setMentors([]));
  }, []);

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round" aria-hidden>
              arrow_back
            </span>
          </button>
          <h2>Top Mentors</h2>
          <button
            type="button"
            className="icon-btn page-header__action"
            onClick={() => navigate('/search-results')}
            aria-label="Search"
          >
            <img src="/assets/home/Fill%201.svg" alt="" />
          </button>
        </div>
        <div className="mentor-list">
          {mentors.map((mentor) => (
            <button
              key={mentor.id}
              type="button"
              className="mentor-list-row"
              onClick={() => navigate('/mentor-profile', { state: { mentor } })}
            >
              <div className="mentor-list-avatar">
                {mentor.imagePath ? (
                  <img src={mentor.imagePath} alt={mentor.name} />
                ) : (
                  <span className="material-icons-round mentor-list-avatar__icon" aria-hidden>
                    person
                  </span>
                )}
              </div>
              <div>
                <div className="mentor-list-name">{mentor.name}</div>
                <div className="mentor-list-sub">{mentor.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <MainBottomNav currentIndex={0} />
    </div>
  );
}
