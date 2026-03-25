import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import { completedCourses, ongoingCourses } from '../data/myCourses.js';

export default function MyCourses() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('completed');
  const [query, setQuery] = useState('');

  const source = tab === 'completed' ? completedCourses : ongoingCourses;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((course) =>
      course.title.toLowerCase().includes(needle) ||
      course.category.toLowerCase().includes(needle)
    );
  }, [query, source]);

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="mycourses-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h3>My Courses</h3>
          <button type="button" className="icon-btn" onClick={() => navigate('/profile')}>
            <span className="material-icons-outlined" aria-hidden>person_outline</span>
          </button>
        </div>

        <div className="mycourses-search">
          <input
            placeholder="Search for ..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <img src="/assets/my_courses/search.svg" alt="Search" />
        </div>

        <div className="mycourses-tabs">
          <button
            type="button"
            className={`mycourses-tab ${tab === 'completed' ? 'active' : ''}`}
            onClick={() => setTab('completed')}
          >
            Completed
          </button>
          <button
            type="button"
            className={`mycourses-tab ${tab === 'ongoing' ? 'active' : ''}`}
            onClick={() => setTab('ongoing')}
          >
            Ongoing
          </button>
        </div>

        <div className="mycourses-list">
          {filtered.map((course) => (
            <div
              key={course.title}
              className="mycourses-card"
              role="button"
              tabIndex={0}
              onClick={() => {
                if (tab === 'completed') {
                  navigate('/completed-course', { state: { course } });
                } else {
                  navigate('/ongoing-course', { state: { course } });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (tab === 'completed') {
                    navigate('/completed-course', { state: { course } });
                  } else {
                    navigate('/ongoing-course', { state: { course } });
                  }
                }
              }}
            >
              <div className="mycourses-card__cover" />
              <div className="mycourses-card__body">
                <div className="mycourses-card__meta">{course.category}</div>
                <div className="mycourses-card__title">{course.title}</div>
                <div className="mycourses-card__info">
                  <span className="material-icons-round mycourses-card__star" aria-hidden>star</span>
                  <span>{course.rating}</span>
                  <span className="mycourses-card__divider">|</span>
                  <span>{course.duration}</span>
                </div>
                {tab === 'completed' ? (
                  <button
                    type="button"
                    className="mycourses-card__link"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate('/certificate', {
                        state: {
                          courseTitle: course.title,
                          certificateId: course.certificateId,
                        },
                      });
                    }}
                  >
                    VIEW CERTIFICATE
                  </button>
                ) : (
                  <div className="mycourses-card__progress">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, (course.progress / course.progressTotal) * 100)}%`,
                          background: course.progressColor,
                        }}
                      />
                    </div>
                    <span>{course.progress}/{course.progressTotal}</span>
                  </div>
                )}
              </div>
              {tab === 'completed' && (
                <div className="mycourses-card__badge">
                  <img src="/assets/my_courses/complete.svg" alt="Completed" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <MainBottomNav currentIndex={1} />
    </div>
  );
}
