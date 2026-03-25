import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ongoingCourses } from '../data/myCourses.js';

const SECTIONS = [
  {
    title: 'Section 01 - Introduction',
    duration: '25 Mins',
    lessons: [
      { id: 1, index: '01', title: 'Why Using Graphic De..', duration: '15 Mins' },
      { id: 2, index: '02', title: 'Setup Your Graphic De..', duration: '10 Mins' },
    ],
  },
  {
    title: 'Section 02 - Graphic Design',
    duration: '55 Mins',
    lessons: [
      { id: 3, index: '03', title: 'Take a Look Graphic De..', duration: '08 Mins' },
      { id: 4, index: '04', title: 'Working with Graphic De..', duration: '25 Mins' },
      { id: 5, index: '05', title: 'Working with Frame & Lay..', duration: '12 Mins' },
    ],
  },
];

export default function OngoingCourse() {
  const navigate = useNavigate();
  const location = useLocation();

  const course = useMemo(() => {
    return location.state?.course || ongoingCourses[0];
  }, [location.state]);

  const storageKey = course ? `levelup_completed_${course.title}` : 'levelup_completed_fallback';
  const [completed, setCompleted] = useState(new Set());

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        setCompleted(new Set(list));
      }
    } catch {
      setCompleted(new Set());
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(completed)));
  }, [completed, storageKey]);

  const totalLessons = SECTIONS.reduce((sum, section) => sum + section.lessons.length, 0);
  const isCompleted = completed.size >= totalLessons;
  const resumeSection = SECTIONS[0];
  const resumeLesson = resumeSection.lessons[0];

  if (!course) return null;

  return (
    <div className="home-screen">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>My Courses</h2>
        </div>

        <div className="search-ghost">
          <span>Search for ...</span>
          <span className="search-ghost__icon">
            <img src="/assets/my_courses/search.svg" alt="Search" />
          </span>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="course-section-card">
            <div className="course-section-title">
              <span>{section.title}</span>
              <strong>{section.duration}</strong>
            </div>
            {section.lessons.map((lesson) => {
              const done = completed.has(lesson.id);
              return (
                <div key={lesson.id} className="lesson-row">
                  <span className={`lesson-index ${done ? 'done' : ''}`}>{lesson.index}</span>
                  <div>
                    <div className="lesson-title">{lesson.title}</div>
                    <div className="lesson-duration">{lesson.duration}</div>
                  </div>
                  <button
                    type="button"
                    className="lesson-play"
                    onClick={() => {
                      setCompleted((prev) => new Set([...prev, lesson.id]));
                      navigate('/lesson-player', {
                        state: {
                          sectionTitle: section.title,
                          courseTitle: course.title,
                          lessonTitle: lesson.title,
                        },
                      });
                    }}
                  >
                    Play
                  </button>
                </div>
              );
            })}
          </div>
        ))}

        {isCompleted ? (
          <div className="complete-banner">
            <div>
              <strong>Course Completed</strong>
              <span>Great job. Your certificate is ready.</span>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate('/certificate', {
                  state: {
                    courseTitle: course.title,
                    certificateId: course.certificateId || 'SK24568086',
                  },
                })
              }
            >
              See Certificate
            </button>
          </div>
        ) : null}
      </div>

      <div className="course-footer course-footer--solid">
        <button
          type="button"
          className="primary-pill"
          onClick={() =>
            navigate('/lesson-player', {
              state: {
                sectionTitle: resumeSection.title,
                courseTitle: course.title,
                lessonTitle: resumeLesson.title,
              },
            })
          }
        >
          <span>Continue Courses</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
      </div>
    </div>
  );
}
