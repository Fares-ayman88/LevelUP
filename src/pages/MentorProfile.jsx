import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

const Icon = ({ name, className, variant = 'round' }) => (
  <span className={`material-icons-${variant} ${className}`} aria-hidden>
    {name}
  </span>
);

const FALLBACK_MENTOR = {
  id: 'mentor-fallback',
  name: 'Christopher J. Levine',
  subtitle: 'Graphic Designer At Google',
  category: 'Graphic Design',
  courses: '26',
  students: '15800',
  ratings: '8750',
  imagePath: '',
};

const REVIEW_SEED = [
  {
    name: 'Heather S. McMullen',
    rating: '4.2',
    body: 'The Course is Very Good dolor sit amet, consectetur adipiscing elit. Naturales divitias dixit parab les esse..',
    likes: 760,
    time: '2 Weeks Agos',
    liked: true,
  },
  {
    name: 'Natasha B. Lambert',
    rating: '4.8',
    body: 'The Course is Very Good dolor veterm, quo etiam utuntur hi capiamus..',
    likes: 918,
    time: '2 Weeks Agos',
    liked: false,
  },
];

export default function MentorProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [followed, setFollowed] = useState(false);
  const [showCourses, setShowCourses] = useState(true);
  const [likes, setLikes] = useState(() => REVIEW_SEED.map((item) => ({ ...item })));

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

  const mentor = useMemo(() => {
    const fromState = location.state?.mentor;
    if (fromState) return fromState;
    if (mentors.length) return mentors[0];
    return FALLBACK_MENTOR;
  }, [location.state, mentors]);

  const mentorCourses = useMemo(() => {
    if (!courses.length) return [];
    const byId = courses.filter((course) => course.mentorId && course.mentorId === mentor.id);
    if (byId.length) return byId;
    const byName = courses.filter((course) => course.mentorName === mentor.name);
    return byName.length ? byName : courses.slice(0, 2);
  }, [courses, mentor]);

  const handleToggleBookmark = (event, courseId) => {
    event.stopPropagation();
    const saved = toggleCourseSaved(courseId);
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, bookmarked: saved } : course
      )
    );
  };

  const toggleLike = (index) => {
    setLikes((prev) => {
      const next = prev.slice();
      const item = next[index];
      const liked = !item.liked;
      next[index] = { ...item, liked, likes: liked ? item.likes + 1 : Math.max(item.likes - 1, 0) };
      return next;
    });
  };

  return (
    <div className="app-shell mentor-profile">
      <div className="screen screen--wide">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
          <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
        </button>
        <div className="mentor-profile-card">
          <div className="mentor-profile-header">
            <div className="mentor-profile-avatar">
              {mentor.imagePath ? (
                <img src={mentor.imagePath} alt={mentor.name} />
              ) : (
                <Icon name="person" className="mentor-profile-avatar__icon" />
              )}
            </div>
            <h2>{mentor.name}</h2>
            <p>{mentor.subtitle}</p>
          </div>
          <div className="mentor-stats">
            <div>
              <strong>{mentor.courses}</strong>
              <span>Courses</span>
            </div>
            <div>
              <strong>{mentor.students}</strong>
              <span>Students</span>
            </div>
            <div>
              <strong>{mentor.ratings}</strong>
              <span>Ratings</span>
            </div>
          </div>
          <div className="mentor-actions">
            <button
              type="button"
              className={`ghost-pill ${followed ? 'active' : ''}`}
              onClick={() => setFollowed((prev) => !prev)}
            >
              {followed ? (
                <>
                  <Icon name="check" className="ghost-pill__icon" />
                  Following
                </>
              ) : (
                'Follow'
              )}
            </button>
            <button
              type="button"
              className="primary-pill primary-pill--compact"
              onClick={() => navigate('/mentor-chat-thread')}
            >
              Message
            </button>
          </div>
          <div className="mentor-bio">
            Sed quanta s alias nunc tantum possitne tanta Nec vero sum nescius esse utilitatem in historia non modo voluptatem.
          </div>
          <div className="mentor-tabs">
            <button
              type="button"
              className={`mentor-tab ${showCourses ? 'active' : ''}`}
              onClick={() => setShowCourses(true)}
            >
              Courses
            </button>
            <button
              type="button"
              className={`mentor-tab ${!showCourses ? 'active' : ''}`}
              onClick={() => setShowCourses(false)}
            >
              Ratings
            </button>
          </div>
          {showCourses ? (
            <div className="mentor-courses">
              {mentorCourses.map((course, index) => {
                const isBookmarked = course.bookmarked;
                return (
                  <div key={course.id} className="mentor-course-row">
                    <div className="mentor-course-cover">
                      {course.coverImagePath ? (
                        <img src={course.coverImagePath} alt={course.title} />
                      ) : (
                        <span className="material-icons-outlined course-list-cover__icon" aria-hidden>
                          image
                        </span>
                      )}
                    </div>
                    <div className="mentor-course-info">
                      <span className="course-list-category">{course.category}</span>
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
                    <button
                      type="button"
                      className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                      onClick={(event) => handleToggleBookmark(event, course.id)}
                      aria-label="Bookmark"
                    >
                      <BookmarkIcon className="bookmark-btn__icon" />
                    </button>
                    {index !== mentorCourses.length - 1 ? (
                      <span className="mentor-course-divider" aria-hidden />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mentor-reviews">
              {likes.map((review, index) => (
                <div key={review.name} className="mentor-review-row">
                  <div className="review-avatar" />
                  <div className="mentor-review-body">
                    <div className="review-head">
                      <strong>{review.name}</strong>
                      <span className="review-rating">
                        <Icon name="star" className="review-rating__star" />
                        {review.rating}
                      </span>
                    </div>
                    <p>{review.body}</p>
                    <div className="review-meta">
                      <button
                        type="button"
                        className={`mentor-like ${review.liked ? 'liked' : ''}`}
                        onClick={() => toggleLike(index)}
                      >
                        <Icon
                          name={review.liked ? 'favorite' : 'favorite_border'}
                          className="mentor-like__icon"
                        />
                        {review.likes}
                      </button>
                      <span>{review.time}</span>
                    </div>
                    {index !== likes.length - 1 ? (
                      <span className="mentor-review-divider" aria-hidden />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
