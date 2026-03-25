import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import {
  fetchCourses,
  fetchMentors,
  subscribeCourses,
  subscribeMentors,
  toggleCourseSaved,
} from '../services/homeData.js';

const BookmarkIcon = ({ className }) => (
  <svg viewBox="0 0 13 16" aria-hidden className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.4 4.8312H3.3752C3.0312 4.8312 2.7528 5.1128 2.7528 5.4656C2.7528 5.816 3.0312 6.0968 3.3752 6.0968H9.4C9.744 6.0968 10.0248 5.816 10.0248 5.4656C10.0248 5.1128 9.744 4.8312 9.4 4.8312ZM8.856 0C11.0248 0 12.7752 0.856 12.8 3.0312V15.1752C12.8 15.3128 12.7688 15.4472 12.7032 15.5688C12.6 15.7592 12.4248 15.9032 12.2096 15.9688C12 16.0312 11.7688 16 11.5752 15.8872L6.3904 13.2968L1.2 15.8872C1.0816 15.9496 0.944 15.9904 0.8096 15.9904C0.3592 15.9904 0 15.6248 0 15.1752V3.0312C0 0.856 1.7592 0 3.9184 0H8.856Z"
      fill="currentColor"
    />
  </svg>
);

const StarIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path
      d="M12 3.5l2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.4 21l1.1-6.3-4.6-4.5 6.3-.9L12 3.5z"
      fill="currentColor"
    />
  </svg>
);

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || 'Graphic Design';

  const [query, setQuery] = useState(initialQuery);
  const [showCourses, setShowCourses] = useState(true);
  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);

  useEffect(() => {
    let isActive = true;
    let unsubscribeCourses = () => {};
    let unsubscribeMentors = () => {};

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

    const loadMentors = async () => {
      try {
        const loaded = await fetchMentors();
        if (!isActive) return;
        setMentors(loaded || []);
      } catch {
        if (!isActive) return;
        setMentors([]);
      }
    };

    void Promise.all([loadCourses(), loadMentors()]);

    subscribeCourses(() => {
      void loadCourses();
    }).then((unsubscribe) => {
      unsubscribeCourses = unsubscribe;
    }).catch(() => {});

    subscribeMentors(() => {
      void loadMentors();
    }).then((unsubscribe) => {
      unsubscribeMentors = unsubscribe;
    }).catch(() => {});

    return () => {
      isActive = false;
      unsubscribeCourses();
      unsubscribeMentors();
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const next = trimmed ? trimmed : '';
    setSearchParams(next ? { q: next } : {});
  }, [query, setSearchParams]);

  const filteredCourses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((course) => {
      return (
        course.title.toLowerCase().includes(needle) ||
        course.category.toLowerCase().includes(needle)
      );
    });
  }, [courses, query]);

  const filteredMentors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mentors;
    return mentors.filter((mentor) => {
      return (
        mentor.name.toLowerCase().includes(needle) ||
        mentor.category.toLowerCase().includes(needle)
      );
    });
  }, [mentors, query]);

  useEffect(() => {
    if (!query.trim()) return;
    if (filteredCourses.length > 0) {
      setShowCourses(true);
    } else if (filteredMentors.length > 0) {
      setShowCourses(false);
    }
  }, [filteredCourses, filteredMentors, query]);

  const handleToggleBookmark = (event, courseId) => {
    event.stopPropagation();
    const saved = toggleCourseSaved(courseId);
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, bookmarked: saved } : course
      )
    );
  };

  const visibleCount = showCourses ? filteredCourses.length : filteredMentors.length;
  const headerTitle = showCourses ? 'Online Courses' : 'Mentors';
  const queryLabel = query.trim() || 'All';

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round" aria-hidden>
              arrow_back
            </span>
          </button>
          <h2>{headerTitle}</h2>
        </div>
        <div className="search-results-bar">
          <img src="/assets/home/Fill%201.svg" alt="Search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Graphic Design"
          />
          <button
            type="button"
            className="search-results-filter"
            onClick={() => navigate('/filter')}
            aria-label="Filter"
          >
            <span className="material-icons-round" aria-hidden>
              tune
            </span>
          </button>
        </div>
        <div className="result-tabs">
          <button
            type="button"
            className={`result-tab ${showCourses ? 'active' : ''}`}
            onClick={() => setShowCourses(true)}
          >
            Courses
          </button>
          <button
            type="button"
            className={`result-tab ${!showCourses ? 'active' : ''}`}
            onClick={() => setShowCourses(false)}
          >
            Mentors
          </button>
        </div>
        <div className="result-summary">
          <span>Result for "{queryLabel}"</span>
          <span className="result-count">
            {visibleCount} FOUNDS
            <span className="material-icons-round" aria-hidden>
              arrow_forward_ios
            </span>
          </span>
        </div>
        <div className={`result-list ${showCourses ? 'result-list--grid' : ''}`}>
          {showCourses
            ? filteredCourses.map((course) => {
                const isBookmarked = course.bookmarked;
                return (
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
                        <button
                          type="button"
                          className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                          onClick={(event) => {
                            handleToggleBookmark(event, course.id);
                          }}
                          aria-label="Bookmark"
                        >
                          <BookmarkIcon className="bookmark-btn__icon" />
                        </button>
                      </div>
                      <div className="course-list-title">{course.title}</div>
                      <div className="course-list-price">
                        <strong>{course.price}</strong>
                        {course.oldPrice ? <span>{course.oldPrice}</span> : null}
                      </div>
                      <div className="course-list-meta">
                        <StarIcon className="course-list-star" />
                        <span className="course-list-rating">{course.rating}</span>
                        <span className="course-list-divider">|</span>
                        <span>{course.students}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            : filteredMentors.map((mentor) => (
                <button
                  key={mentor.id}
                  type="button"
                  className="mentor-result"
                  onClick={() => navigate('/mentor-profile', { state: { mentor } })}
                >
                  <div className="mentor-result-info">
                    <div className="mentor-list-name">{mentor.name}</div>
                    <div className="mentor-list-sub">{mentor.category}</div>
                  </div>
                  <div className="mentor-result-avatar">
                    {mentor.imagePath ? (
                      <img src={mentor.imagePath} alt={mentor.name} />
                    ) : (
                      <span className="material-icons-round mentor-result-avatar__icon" aria-hidden>
                        person
                      </span>
                    )}
                  </div>
                </button>
              ))}
        </div>
      </div>
      <MainBottomNav currentIndex={0} />
    </div>
  );
}
