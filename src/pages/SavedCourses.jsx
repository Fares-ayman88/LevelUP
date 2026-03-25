import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchCourses, subscribeCourses } from '../services/homeData.js';

const StarIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path
      d="M12 3.5l2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.4 21l1.1-6.3-4.6-4.5 6.3-.9L12 3.5z"
      fill="currentColor"
    />
  </svg>
);

export default function SavedCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    let isActive = true;
    let unsubscribe = () => {};

    const loadCourses = async () => {
      try {
        const loaded = await fetchCourses();
        if (!isActive) return;
        setCourses(loaded || []);
      } catch {
        if (!isActive) return;
        setCourses([]);
      }
    };

    void loadCourses();
    subscribeCourses(() => {
      void loadCourses();
    }).then((off) => {
      unsubscribe = off;
    }).catch(() => {});

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const saved = courses.filter((course) => course.bookmarked);

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Saved Courses</h2>
        </div>
        <div className="course-list">
          {saved.map((course) => (
            <div
              key={course.id}
              className="course-list-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/course-detail', { state: { course } })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  navigate('/course-detail', { state: { course } });
                }
              }}
            >
              <div className="course-list-cover">
                {course.coverImagePath ? (
                  <img src={course.coverImagePath} alt={course.title} />
                ) : (
                  <span className="material-icons-outlined course-list-cover__icon" aria-hidden>
                    image
                  </span>
                )}
              </div>
              <div className="course-list-body">
                <div className="course-list-row">
                  <span className="course-list-category">{course.category}</span>
                </div>
                <div className="course-list-title">{course.title}</div>
                <div className="course-list-price">
                  <strong>{course.price}</strong>
                  <span>{course.oldPrice}</span>
                </div>
                <div className="course-list-meta">
                  <StarIcon className="course-list-star" />
                  <span className="course-list-rating">{course.rating}</span>
                  <span className="course-list-divider">|</span>
                  <span>{course.students}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
