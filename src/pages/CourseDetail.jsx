import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';

const FALLBACK_COURSE = {
  id: 'fallback-course',
  category: 'Graphic Design',
  title: 'Design Principles: Organizing ..',
  mentorName: 'Sonja Carter',
  mentorSubtitle: 'Graphic Design Mentor',
  mentorImagePath: '',
  coverImagePath: '',
  price: 'EGP 1450',
  rating: '4.2',
  classes: 21,
  hours: 42,
};

const FALLBACK_CURRICULUM = [
  {
    title: 'Section 01 - Introduction',
    duration: '25 Mins',
    lessons: [
      { id: 1, index: '01', title: 'Why Using Graphic De..', duration: '15 Mins', locked: false },
      { id: 2, index: '02', title: 'Setup Your Graphic De..', duration: '10 Mins', locked: false },
    ],
  },
  {
    title: 'Section 02 - Graphic Design',
    duration: '55 Mins',
    lessons: [
      { id: 3, index: '03', title: 'Take a Look Graphic De..', duration: '08 Mins', locked: true },
      { id: 4, index: '04', title: 'Working with Graphic De..', duration: '25 Mins', locked: true },
      { id: 5, index: '05', title: 'Working with Frame & Lay..', duration: '12 Mins', locked: true },
      { id: 6, index: '06', title: 'Using Graphic Plugins', duration: '10 Mins', locked: true },
    ],
  },
  {
    title: "Section 03 - Let's Practice",
    duration: '35 Mins',
    lessons: [
      { id: 7, index: '07', title: "Let's Design a Sign Up Fo..", duration: '15 Mins', locked: true },
      { id: 8, index: '08', title: 'Sharing work with Team', duration: '20 Mins', locked: true },
    ],
  },
];

const REVIEW_SEED = [
  {
    name: 'William S. Cunningham',
    rating: '4.5',
    body: 'The Course is Very Good dolor sit amet, consectetur adipiscing elit. Naturales divitias dixit parab.',
    likes: '578',
    time: '2 Weeks Agos',
  },
  {
    name: 'Martha E. Thompson',
    rating: '4.5',
    body: 'The Course is Very Good dolor sit amet, consectetur adipiscing elit. Naturales divitias dixit parab.',
    likes: '578',
    time: '2 Weeks Agos',
  },
];

const ABOUT_PARAGRAPHS = [
  'Graphic Design now a popular profession graphic design by off your carrer about tantas regiones barbarorum pedibus obit',
  'Graphic Design n a popular profession | Cur tantas regiones barbarorum pedibus obit, maria transmi Et ne nimium bedus est; Addidisti ad extremum etiam',
];

const Icon = ({ name, className, variant = 'round' }) => (
  <span className={`material-icons-${variant} ${className}`} aria-hidden>
    {name}
  </span>
);

function buildCurriculumFromSections(rawSections = []) {
  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    return FALLBACK_CURRICULUM;
  }
  const curriculum = [];
  let lessonCounter = 1;

  for (let sectionIndex = 0; sectionIndex < rawSections.length; sectionIndex += 1) {
    const section = rawSections[sectionIndex] || {};
    const rawTitle = `${section.title || ''}`.trim();
    const sectionNumber = `${sectionIndex + 1}`.padStart(2, '0');
    const sectionTitle = !rawTitle
      ? `Section ${sectionNumber}`
      : rawTitle.toLowerCase().startsWith('section')
        ? rawTitle
        : `Section ${sectionNumber} - ${rawTitle}`;
    const sourceLessons = Array.isArray(section.lessons) ? section.lessons : [];
    const lessons = [];

    for (let lessonIndex = 0; lessonIndex < sourceLessons.length; lessonIndex += 1) {
      const sourceLesson = sourceLessons[lessonIndex] || {};
      const lessonTitle = `${sourceLesson.title || ''}`.trim() || `Lesson ${lessonCounter}`;
      const rawVideoUrl = `${sourceLesson.videoUrl || sourceLesson.youtubeUrl || ''}`.trim();

      lessons.push({
        id: lessonCounter,
        index: `${lessonCounter}`.padStart(2, '0'),
        title: lessonTitle,
        duration: '',
        locked: sectionIndex > 0,
        videoUrl: rawVideoUrl,
      });
      lessonCounter += 1;
    }

    curriculum.push({
      title: sectionTitle,
      duration: '',
      lessons,
    });
  }

  return curriculum.length > 0 ? curriculum : FALLBACK_CURRICULUM;
}

export default function CourseDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAbout, setShowAbout] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewPreview, setReviewPreview] = useState('');
  const reviewInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const course = useMemo(() => {
    return location.state?.course || FALLBACK_COURSE;
  }, [location.state]);

  const courseId = course?.id || FALLBACK_COURSE.id;

  const [isEnrolled, setIsEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState(() => new Set());

  useEffect(() => {
    const stored = localStorage.getItem(`levelup_enrolled_${courseId}`);
    setIsEnrolled(stored === '1');
    const lessons = localStorage.getItem(`levelup_completed_${courseId}`);
    if (lessons) {
      try {
        const parsed = JSON.parse(lessons);
        setCompletedLessons(new Set(parsed));
      } catch {
        setCompletedLessons(new Set());
      }
    } else {
      setCompletedLessons(new Set());
    }
  }, [courseId]);

  useEffect(() => {
    localStorage.setItem(`levelup_enrolled_${courseId}`, isEnrolled ? '1' : '0');
  }, [courseId, isEnrolled]);

  useEffect(() => {
    localStorage.setItem(`levelup_completed_${courseId}`, JSON.stringify(Array.from(completedLessons)));
  }, [courseId, completedLessons]);

  useEffect(() => {
    return () => {
      if (reviewPreview) URL.revokeObjectURL(reviewPreview);
    };
  }, [reviewPreview]);

  const curriculum = useMemo(() => {
    return buildCurriculumFromSections(course.sections);
  }, [course.sections]);
  const totalLessons = curriculum.reduce((sum, section) => sum + section.lessons.length, 0);
  const mentorName = (course.mentorName || '').trim() || 'Mentor';
  const mentorSubtitle = (course.mentorSubtitle || '').trim() || `${course.category} Mentor`;

  const handleLessonClick = (lesson, sectionTitle) => {
    if (lesson.locked && !isEnrolled) {
      setMessage('Enroll to unlock this lesson.');
      return;
    }
    setCompletedLessons((prev) => new Set([...prev, lesson.id]));
    navigate('/lesson-player', {
      state: {
        sectionTitle,
        courseTitle: course.title || 'Course',
        lessonTitle: lesson.title || `Lesson ${lesson.index}`,
        videoUrl: lesson.videoUrl || '',
      },
    });
  };

  const handleEmoji = () => {
    setReviewText((prev) => (prev ? `${prev} 😊` : '😊'));
    reviewInputRef.current?.focus();
  };

  const handlePickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (reviewPreview) URL.revokeObjectURL(reviewPreview);
    setReviewImage(file);
    setReviewPreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (reviewPreview) URL.revokeObjectURL(reviewPreview);
    setReviewImage(null);
    setReviewPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendReview = () => {
    const trimmed = reviewText.trim();
    if (!trimmed && !reviewImage) {
      setMessage('Write a review first');
      return;
    }
    setReviewText('');
    handleRemoveImage();
    setMessage('Review submitted');
  };

  const mentorPayload = {
    mentor: {
      id: course.mentorId || course.mentorName,
      name: mentorName,
      subtitle: mentorSubtitle,
      category: course.category,
      courses: '26',
      students: '15800',
      ratings: '8750',
      imagePath: course.mentorImagePath,
    },
  };

  return (
    <div className="app-shell course-detail">
      <div className="course-hero">
        {course.coverImagePath ? (
          <img src={course.coverImagePath} alt={course.title} />
        ) : (
          <div className="course-hero__placeholder">
            <Icon name="image" variant="outlined" className="course-hero__icon" />
          </div>
        )}
        <button type="button" className="hero-back" onClick={() => navigate(-1)}>
          <Icon name="arrow_back" className="hero-back__icon" />
        </button>
      </div>
      <div className="screen screen--wide">
        <div className="course-info-card">
          <div className="course-info-top">
            <span className="course-tag">{course.category}</span>
            <div className="course-rating">
              <Icon name="star" className="course-rating__star" />
              <span>{course.rating}</span>
            </div>
          </div>
          {mentorName ? (
            <div className="course-mentor-mini">
              <div className="course-mentor-mini__avatar">
                {course.mentorImagePath ? (
                  <img src={course.mentorImagePath} alt={mentorName} />
                ) : (
                  <Icon name="person" className="course-mentor-mini__icon" />
                )}
              </div>
              <span>Mentor: {mentorName}</span>
            </div>
          ) : null}
          <h1>{course.title}</h1>
          <div className="course-info-meta">
            <div className="course-info-meta__item">
              <Icon name="people_outline" variant="outlined" className="course-info-meta__icon" />
              <span>{course.classes} Classes</span>
            </div>
            <span className="course-info-meta__divider">|</span>
            <div className="course-info-meta__item">
              <Icon name="access_time" variant="outlined" className="course-info-meta__icon" />
              <span>{course.hours} Hours</span>
            </div>
            <span className="course-price">{course.price}</span>
          </div>
          <div className="course-tabs">
            <button
              type="button"
              className={`course-tab ${showAbout ? 'active' : ''}`}
              onClick={() => setShowAbout(true)}
            >
              About
            </button>
            <button
              type="button"
              className={`course-tab ${!showAbout ? 'active' : ''}`}
              onClick={() => setShowAbout(false)}
            >
              Curriculum
            </button>
          </div>
          {showAbout ? (
            <div className="course-about">
              {ABOUT_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <span className="course-read-more">Read More</span>
            </div>
          ) : (
            <div className="course-curriculum">
              {curriculum.map((section, sectionIndex) => {
                const parts = section.title.split(' - ');
                const prefix = parts[0] || section.title;
                const name = parts.slice(1).join(' - ');
                return (
                  <div key={`${section.title}-${sectionIndex}`} className="course-section">
                    <div className="course-section-header">
                      <div className="course-section-title">
                        <span>{prefix}</span>
                        {name ? <span className="course-section-name"> {name}</span> : null}
                      </div>
                      {section.duration ? (
                        <span className="course-section-duration">{section.duration}</span>
                      ) : null}
                    </div>
                    {section.lessons.map((lesson) => {
                      const completed = completedLessons.has(lesson.id);
                      const locked = lesson.locked && !isEnrolled;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          className={`lesson-row ${locked ? 'locked' : ''}`}
                          onClick={() => handleLessonClick(lesson, section.title)}
                        >
                          <span className={`lesson-index ${completed ? 'done' : ''}`}>
                            {lesson.index}
                          </span>
                          <span className="lesson-content">
                            <span className="lesson-title">{lesson.title}</span>
                            {lesson.duration ? (
                              <span className="lesson-duration">{lesson.duration}</span>
                            ) : null}
                          </span>
                          {locked ? (
                            <Icon name="lock_outline" variant="outlined" className="lesson-lock" />
                          ) : (
                            <span className="lesson-play">
                              <Icon name="play_arrow" className="lesson-play__icon" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="course-section-block">
          <h3>Instructor</h3>
          <button
            type="button"
            className="instructor-row"
            onClick={() => navigate('/mentor-profile', { state: mentorPayload })}
          >
            <div className="instructor-avatar">
              {course.mentorImagePath ? (
                <img src={course.mentorImagePath} alt={mentorName} />
              ) : (
                <Icon name="person" className="instructor-avatar__icon" />
              )}
            </div>
            <div className="instructor-info">
              <div className="instructor-name">{mentorName}</div>
              <div className="instructor-sub">{mentorSubtitle}</div>
            </div>
            <span className="instructor-chat" aria-hidden>
              <Icon name="chat_bubble_outline" variant="outlined" className="instructor-chat__icon" />
            </span>
          </button>
        </div>
        <div className="course-section-block">
          <h3>What You'll Get</h3>
          <div className="bullet-list">
            <div className="bullet-item">
              <Icon name="menu_book" variant="outlined" className="bullet-icon" />
              <span>{totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}</span>
            </div>
            <div className="bullet-item">
              <Icon name="devices" variant="outlined" className="bullet-icon" />
              <span>Access Mobile, Desktop &amp; TV</span>
            </div>
            <div className="bullet-item">
              <Icon name="bar_chart" variant="outlined" className="bullet-icon" />
              <span>Beginner Level</span>
            </div>
            <div className="bullet-item">
              <Icon name="graphic_eq" variant="outlined" className="bullet-icon" />
              <span>Audio Book</span>
            </div>
            <div className="bullet-item">
              <Icon name="all_inclusive" className="bullet-icon" />
              <span>Lifetime Access</span>
            </div>
            <div className="bullet-item">
              <Icon name="quiz" variant="outlined" className="bullet-icon" />
              <span>100 Quizzes</span>
            </div>
            <div className="bullet-item">
              <Icon name="verified" variant="outlined" className="bullet-icon" />
              <span>Certificate of Completion</span>
            </div>
          </div>
        </div>
        <div className="course-section-block">
          <div className="course-reviews-header">
            <h3>Reviews</h3>
            <button type="button" onClick={() => navigate('/reviews', { state: { course } })}>
              <span>SEE ALL</span>
              <Icon name="arrow_forward_ios" className="course-reviews-arrow" />
            </button>
          </div>
          <div className="review-compose">
            <div className="review-compose__row">
              <div className="review-compose__avatar" />
              <textarea
                ref={reviewInputRef}
                className="review-compose__input"
                rows={1}
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="Write your review..."
              />
              <button type="button" className="review-compose__icon-btn" onClick={handleEmoji}>
                <Icon name="emoji_emotions" variant="outlined" className="review-compose__icon" />
              </button>
              <button
                type="button"
                className="review-compose__icon-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="image" variant="outlined" className="review-compose__icon" />
              </button>
              <button type="button" className="review-compose__send" onClick={handleSendReview}>
                <Icon name="send" className="review-compose__send-icon" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePickImage}
              />
            </div>
            {reviewPreview ? (
              <div className="review-compose__preview">
                <img src={reviewPreview} alt="Review upload" />
                <button
                  type="button"
                  className="review-compose__preview-close"
                  onClick={handleRemoveImage}
                >
                  <Icon name="close" className="review-compose__close-icon" />
                </button>
              </div>
            ) : null}
          </div>
          <div className="reviews-list">
            {REVIEW_SEED.map((review) => (
              <div key={review.name} className="review-card">
                <div className="review-avatar" />
                <div className="review-body">
                  <div className="review-head">
                    <strong>{review.name}</strong>
                    <span className="review-rating">
                      <Icon name="star" className="review-rating__star" />
                      {review.rating}
                    </span>
                  </div>
                  <p>{review.body}</p>
                  <div className="review-meta">
                    <span className="review-like">
                      <Icon name="favorite" className="review-heart" />
                      {review.likes}
                    </span>
                    <span>{review.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {!isEnrolled && (
        <div className="enroll-bar">
          <button
            type="button"
            className="enroll-bar__btn"
            onClick={() => navigate('/payment-methods', { state: { course } })}
          >
            <span>Enroll Course - {course.price}</span>
            <span className="enroll-bar__arrow">
              <Icon name="arrow_forward" className="enroll-bar__arrow-icon" />
            </span>
          </button>
        </div>
      )}
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
