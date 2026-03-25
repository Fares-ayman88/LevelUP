import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MainBottomNav from '../components/MainBottomNav.jsx';
import {
  buildCategories,
  fetchCourses,
  fetchMentors,
  subscribeCourses,
  subscribeMentors,
  toggleCourseSaved,
} from '../services/homeData.js';
import { resolveAuthRole, useAuth } from '../state/auth.jsx';
import './HomeLayout.css';

const PROMO_SLIDES = [
  {
    background: '#0d65ff',
    bubbleOne: 'rgba(31, 119, 255, 0.5)',
    bubbleTwo: '#1c74ff',
    kicker: '25% OFF*',
    title: "Today's Special",
    body: 'Get a Discount for Every\nCourse Order only Valid for\nToday.!',
    cta: 'See Me',
    textColor: '#ffffff',
    shadow: 'rgba(13, 101, 255, 0.2)',
  },
  {
    background: '#e44b4b',
    bubbleOne: 'rgba(255, 123, 123, 0.4)',
    bubbleTwo: '#d93a3a',
    kicker: 'NEW',
    title: 'Course Available Now',
    body: 'UI Motion Basics is live.\nJoin the new batch today.',
    cta: 'See Me',
    textColor: '#ffffff',
    shadow: 'rgba(228, 75, 75, 0.2)',
  },
  {
    background: '#1c1f2a',
    bubbleOne: 'rgba(42, 47, 63, 0.4)',
    bubbleTwo: '#262b3a',
    kicker: 'PRO',
    title: 'Night Class Drops',
    body: 'Master layout and grids.\nLimited seats open.',
    cta: 'See Me',
    textColor: '#ffffff',
    shadow: 'rgba(28, 31, 42, 0.2)',
  },
];

const ActionIcon = ({ icon, variant = 'round' }) => (
  <span className={`material-icons-${variant} home-action-icon`} aria-hidden>
    {icon}
  </span>
);

const ArrowRightIcon = () => (
  <span className="material-icons-round section-header__arrow" aria-hidden>
    arrow_forward_ios
  </span>
);

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

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="course-card__star">
    <path
      d="M12 3.5l2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.4 21l1.1-6.3-4.6-4.5 6.3-.9L12 3.5z"
      fill="currentColor"
    />
  </svg>
);

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [filter, setFilter] = useState('All');
  const [promoIndex, setPromoIndex] = useState(0);
  const [sidebarAvatarFailed, setSidebarAvatarFailed] = useState(false);

  useEffect(() => {
    let isActive = true;
    let unsubscribeCourses = () => {};
    let unsubscribeMentors = () => {};

    const loadCourses = async () => {
      try {
        const loadedCourses = await fetchCourses();
        if (!isActive) return;
        setCourses(loadedCourses || []);
      } catch {
        if (!isActive) return;
        setCourses([]);
      }
    };

    const loadMentors = async () => {
      try {
        const loadedMentors = await fetchMentors();
        if (!isActive) return;
        setMentors(loadedMentors || []);
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
    const timer = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const categories = useMemo(() => buildCategories(courses), [courses]);
  const filters = useMemo(() => ['All', ...categories], [categories]);
  const activeFilter = filters.includes(filter) ? filter : 'All';
  const visibleCourses = activeFilter === 'All'
    ? courses
    : courses.filter((course) => course.category === activeFilter);

  const resolvedEmail = (profile?.email || user?.email || '').toString().trim();
  const resolvedName = (profile?.name || user?.displayName || resolvedEmail || '').split('@')[0];
  const greeting = resolvedName ? `Hi, ${resolvedName}` : 'Hi';
  const role = resolveAuthRole(profile, user);
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';
  const isStudent = role === 'student';
  const userInitial = (resolvedName || 'U').trim().charAt(0).toUpperCase();
  const sidebarPhotoUrl = profile?.photoUrl || '';
  const showSidebarPhoto = Boolean(sidebarPhotoUrl) && !sidebarAvatarFailed;

  useEffect(() => {
    setSidebarAvatarFailed(false);
  }, [sidebarPhotoUrl]);

  const subtitle = isAdmin
    ? 'Admin Account'
    : isInstructor
      ? 'Instructor Account'
      : 'What would you like to learn today?\nSearch below.';
  const openNotifications = () => navigate('/notifications');

  const adminControlActions = [
    {
      key: 'add',
      label: 'Add',
      icon: 'add',
      variant: 'round',
      onClick: () => navigate('/admin-courses'),
    },
    {
      key: 'history',
      label: 'History',
      icon: 'history',
      variant: 'round',
      onClick: () => navigate('/admin-transactions'),
    },
    {
      key: 'requests',
      label: 'Requests',
      icon: 'verified_user',
      variant: 'outlined',
      onClick: () => navigate('/instructor-requests'),
    },
    {
      key: 'sort',
      label: 'Sort',
      icon: 'swap_vert',
      variant: 'round',
      onClick: () => navigate('/featured-sort'),
    },
  ];

  const instructorControlActions = [
    {
      key: 'add',
      label: 'Add',
      icon: 'add',
      variant: 'round',
      onClick: () => navigate('/mentor-courses'),
    },
    {
      key: 'history',
      label: 'History',
      icon: 'history',
      variant: 'round',
      onClick: () => navigate('/mentor-transactions'),
    },
  ];

  const notificationAction = {
    key: 'notifications',
    label: 'Notifications',
    icon: 'notifications_none',
    variant: 'outlined',
    onClick: openNotifications,
  };

  const headerActions = [];

  const actionHints = {
    add: 'Create and manage course content',
    history: 'Review recent payment activity',
    requests: 'Handle instructor applications',
    sort: 'Arrange featured home sections',
    notifications: 'Check latest alerts and announcements',
    continueLearning: 'Jump back to your in-progress lessons',
    myCourses: 'Browse all courses you are enrolled in',
    completedCourses: 'Review courses you have finished',
    certificates: 'View and download your earned certificates',
    savedCourses: 'Open your bookmarked courses',
    transactions: 'See recent purchases and payment receipts',
    support: 'Chat with support when you need help',
  };

  const studentActions = [
    {
      key: 'continueLearning',
      label: 'Continue Learning',
      icon: 'play_circle',
      variant: 'round',
      onClick: () => navigate('/ongoing-course'),
    },
    {
      key: 'myCourses',
      label: 'My Courses',
      icon: 'menu_book',
      variant: 'round',
      onClick: () => navigate('/my-courses'),
    },
    {
      key: 'completedCourses',
      label: 'Completed',
      icon: 'task_alt',
      variant: 'round',
      onClick: () => navigate('/completed-course'),
    },
    {
      key: 'certificates',
      label: 'Certificates',
      icon: 'workspace_premium',
      variant: 'round',
      onClick: () => navigate('/certificate'),
    },
    {
      key: 'savedCourses',
      label: 'Saved Courses',
      icon: 'bookmark_border',
      variant: 'outlined',
      onClick: () => navigate('/saved-courses'),
    },
    {
      key: 'transactions',
      label: 'Transactions',
      icon: 'receipt_long',
      variant: 'outlined',
      onClick: () => navigate('/transactions'),
    },
    {
      key: 'support',
      label: 'Support',
      icon: 'support_agent',
      variant: 'round',
      onClick: () => navigate('/support-chats'),
    },
    { ...notificationAction },
  ];

  const sidebarActionsByRole = isStudent
    ? studentActions
    : isAdmin
      ? [...adminControlActions, { ...notificationAction }]
      : isInstructor
        ? [...instructorControlActions, { ...notificationAction }]
        : [{ ...notificationAction }];

  const sidebarActions = sidebarActionsByRole.map(
    (action) => ({
      ...action,
      hint: actionHints[action.key] || 'Open this section',
    })
  );
  const roleBadge = isAdmin
    ? 'Admin'
    : isInstructor
      ? 'Instructor'
      : isStudent
        ? 'Student'
        : 'Guest';
  const actionByKey = new Map(sidebarActions.map((action) => [action.key, action]));
  const quickActionKeys = isStudent
    ? ['continueLearning', 'savedCourses', 'support']
    : isAdmin
      ? ['add', 'requests', 'sort']
      : isInstructor
        ? ['add', 'history']
        : ['notifications'];
  const quickActions = quickActionKeys
    .map((key) => actionByKey.get(key))
    .filter(Boolean);
  const railTitle = isAdmin
    ? 'Admin tools'
    : isInstructor
      ? 'Instructor tools'
      : 'Quick access';
  const railDescription = isAdmin
    ? 'Use the most important controls without repeating the full menu.'
    : isInstructor
      ? 'Keep teaching actions close and leave the rest to the main content.'
      : 'Reach your next step fast without overloading the page.';
  const sidebarStats = [
    {
      key: 'courses',
      label: 'Courses',
      value: `${courses.length}`,
    },
    {
      key: 'mentors',
      label: 'Mentors',
      value: `${mentors.length}`,
    },
    {
      key: 'categories',
      label: 'Categories',
      value: `${categories.length}`,
    },
  ];
  const currentViewLabel = activeFilter === 'All' ? 'All categories' : activeFilter;
  const currentViewText = `${visibleCourses.length} course${visibleCourses.length === 1 ? '' : 's'} in view`;

  const promo = PROMO_SLIDES[promoIndex];

  const handleToggleBookmark = (event, courseId) => {
    event.preventDefault();
    event.stopPropagation();
    const saved = toggleCourseSaved(courseId);
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId ? { ...course, bookmarked: saved } : course
      )
    );
  };

  return (
    <div className="home-screen">
      <div className="home-layout">
        <aside className="home-sidebar" aria-label="User controls">
          <div className="home-sidebar-card">
            <div className="home-sidebar-user">
              <div className="home-sidebar-avatar" aria-hidden>
                {showSidebarPhoto ? (
                  <img
                    src={sidebarPhotoUrl}
                    alt={`${resolvedName || 'User'} profile`}
                    referrerPolicy="no-referrer"
                    onError={() => setSidebarAvatarFailed(true)}
                  />
                ) : (
                  userInitial
                )}
              </div>
              <div className="home-sidebar-user__text">
                <span className="home-sidebar-user__badge">{roleBadge}</span>
                <h3>{greeting}</h3>
                <p>{subtitle}</p>
              </div>
            </div>
            <div className="home-sidebar-focus">
              <div className="home-sidebar-controls__title">Overview</div>
              <div className="home-sidebar-metrics">
                {sidebarStats.map((item) => (
                  <div key={item.key} className="home-sidebar-metric">
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="home-sidebar-note home-sidebar-note--focus">
                <span>Current view</span>
                <strong>{currentViewLabel}</strong>
                <small>{currentViewText}</small>
              </div>
            </div>
          </div>
        </aside>
        <div className="screen home-main">
          <section className="home-main__intro">
            <div className="home-header">
              <div>
                <h2>{greeting}</h2>
                <p className="home-subtitle">{subtitle}</p>
              </div>
              <div className="home-actions">
                {headerActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="home-outline-btn"
                    onClick={action.onClick}
                    title={action.label}
                    aria-label={action.label}
                  >
                    <span className="home-outline-btn__inner">
                      <ActionIcon icon={action.icon} variant={action.variant} />
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="home-notification"
                  onClick={openNotifications}
                  aria-label="Notifications"
                >
                  <img src="/assets/home/NOTIFICATIONS.svg" alt="Notifications" />
                  {isAdmin ? <span className="home-notification__dot" /> : null}
                </button>
              </div>
            </div>
            <div
              className="search-bar search-bar--static"
              onClick={() => navigate('/search-results')}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/search-results');
                }
              }}
            >
              <img src="/assets/home/Fill%201.svg" alt="Search" width={20} height={20} />
              <span>Search for..</span>
              <button
                type="button"
                className="search-filter"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate('/filter');
                }}
                aria-label="Filter"
              >
                <span className="material-icons-round" aria-hidden>
                  tune
                </span>
              </button>
            </div>
          </section>

          <section className="home-main__promo">
            <div className="promo-carousel">
              <div
                className="promo-card"
                style={{
                  background: promo.background,
                  boxShadow: `0 14px 22px ${promo.shadow}`,
                  color: promo.textColor,
                }}
              >
                <div
                  className="promo-bubble promo-bubble--one"
                  style={{ background: promo.bubbleOne }}
                />
                <div
                  className="promo-bubble promo-bubble--two"
                  style={{ background: promo.bubbleTwo }}
                />
                <div className="promo-kicker">{promo.kicker}</div>
                <div className="promo-title">{promo.title}</div>
                <div className="promo-body">{promo.body}</div>
                <div className="promo-cta" style={{ color: promo.background }}>
                  {promo.cta}
                </div>
              </div>
              <div className="promo-dots">
                {PROMO_SLIDES.map((_, index) => (
                  <button
                    key={`promo-${index}`}
                    type="button"
                    className={`promo-dot ${index === promoIndex ? 'active' : ''}`}
                    onClick={() => setPromoIndex(index)}
                    aria-label={`Promo ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="home-section">
            <div className="section-header">
              <h4>Categories</h4>
              <button type="button" onClick={() => navigate('/all-category')}>
                <span>SEE ALL</span>
                <ArrowRightIcon />
              </button>
            </div>
            <div className="category-row">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`category-link ${item === activeFilter ? 'active' : ''}`}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="home-section">
            <div className="section-header">
              <h4>Popular Courses</h4>
              <button type="button" onClick={() => navigate('/popular-courses')}>
                <span>SEE ALL</span>
                <ArrowRightIcon />
              </button>
            </div>
            <div className="course-filter-row">
              {filters.map((item) => (
                <button
                  key={`filter-${item}`}
                  type="button"
                  className={`course-filter ${item === activeFilter ? 'active' : ''}`}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="course-row">
              {visibleCourses.slice(0, 5).map((course) => (
                <button
                  key={course.id}
                  type="button"
                  className="course-card"
                  onClick={() => navigate('/course-detail', { state: { course } })}
                >
                  <div className="course-card__cover">
                    {course.coverImagePath ? (
                      <img src={course.coverImagePath} alt={course.title} />
                    ) : (
                      <span className="material-icons-outlined course-card__cover-icon" aria-hidden>
                        image
                      </span>
                    )}
                  </div>
                  <div className="course-card__body">
                    <div className="course-card__meta">
                      <span>{course.category}</span>
                      <div
                        className={`course-bookmark ${course.bookmarked ? 'active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={(event) => handleToggleBookmark(event, course.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            handleToggleBookmark(event, course.id);
                          }
                        }}
                      >
                        <BookmarkIcon className="course-bookmark__icon" />
                      </div>
                    </div>
                    <div className="course-card__title">{course.title}</div>
                    <div className="course-card__footer">
                      <span className="course-card__price">{course.price}</span>
                      <span className="course-card__divider">|</span>
                      <StarIcon />
                      <span className="course-card__rating">{course.rating}</span>
                      <span className="course-card__divider">|</span>
                      <span className="course-card__students">{course.students}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="home-section">
            <div className="section-header">
              <h4>Top Mentor</h4>
              <button type="button" onClick={() => navigate('/top-mentors')}>
                <span>SEE ALL</span>
                <ArrowRightIcon />
              </button>
            </div>
            <div className="mentor-row">
              {mentors.slice(0, 6).map((mentor) => (
                <button
                  key={mentor.id}
                  type="button"
                  className="mentor-card"
                  onClick={() => navigate('/mentor-profile', { state: { mentor } })}
                >
                  <div className="mentor-avatar">
                    {mentor.imagePath ? (
                      <img src={mentor.imagePath} alt={mentor.name} />
                    ) : (
                      <span className="material-icons-round mentor-avatar__icon" aria-hidden>
                        person
                      </span>
                    )}
                  </div>
                  <div className="mentor-name">{mentor.name}</div>
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="home-rightbar" aria-label="Workspace shortcuts">
          <div className="home-rail-card">
            <div className="home-rail-card__header">
              <span className="home-rail-card__eyebrow">{railTitle}</span>
              <h3>Quick actions</h3>
              <p>{railDescription}</p>
            </div>
            <div className="home-rail-actions">
              {quickActions.map((action) => (
                <button
                  key={`rail-${action.key}`}
                  type="button"
                  className="home-rail-action"
                  onClick={action.onClick}
                >
                  <span className="home-rail-action__icon">
                    <ActionIcon icon={action.icon} variant={action.variant || 'round'} />
                  </span>
                  <span className="home-rail-action__text">
                    <strong>{action.label}</strong>
                    <small>{action.hint}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="home-rail-card home-rail-card--soft">
            <div className="home-rail-card__header">
              <span className="home-rail-card__eyebrow">Snapshot</span>
              <h3>At a glance</h3>
              <p>Small signals to help you scan the page faster.</p>
            </div>
            <div className="home-rail-stats">
              {sidebarStats.map((item) => (
                <div key={`stat-${item.key}`} className="home-rail-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="home-rail-focus">
              <span>Current view</span>
              <strong>{currentViewLabel}</strong>
              <small>{currentViewText}</small>
            </div>
          </div>
        </aside>
      </div>
      <MainBottomNav currentIndex={0} />
    </div>
  );
}
