import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { completedCourses } from '../data/myCourses.js';

const SECTIONS = [
  {
    title: 'Section 01 - Introduction',
    duration: '25 Mins',
    lessons: [
      { index: '01', title: 'Why Using 3D Blender', duration: '15 Mins' },
      { index: '02', title: '3D Blender Installation', duration: '10 Mins' },
    ],
  },
  {
    title: 'Section 02 - Graphic Design',
    duration: '125 Mins',
    lessons: [
      { index: '03', title: 'Take a Look Blender Interfa...', duration: '20 Mins' },
      { index: '04', title: 'The Basic of 3D Modelling', duration: '25 Mins' },
      { index: '05', title: 'Shading and Lighting', duration: '36 Mins' },
      { index: '06', title: 'Rendering for Final Output', duration: '24 Mins' },
    ],
  },
];

export default function CompletedCourse() {
  const navigate = useNavigate();
  const location = useLocation();

  const course = useMemo(() => {
    return location.state?.course || completedCourses[0];
  }, [location.state]);

  if (!course) {
    return null;
  }

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
          <span>{course.title}</span>
          <span className="search-ghost__icon">
            <img src="/assets/my_courses/search.svg" alt="Search" />
          </span>
        </div>

        <div className="course-sections">
          {SECTIONS.map((section) => (
            <div key={section.title} className="course-section-card">
              <div className="course-section-title">
                <span>{section.title}</span>
                <strong>{section.duration}</strong>
              </div>
              {section.lessons.map((lesson) => (
                <div key={lesson.index} className="lesson-row completed">
                  <span className="lesson-index done">{lesson.index}</span>
                  <div>
                    <div className="lesson-title">{lesson.title}</div>
                    <div className="lesson-duration">{lesson.duration}</div>
                  </div>
                  <button
                    type="button"
                    className="lesson-play"
                    onClick={() =>
                      navigate('/lesson-player', {
                        state: {
                          sectionTitle: section.title,
                          courseTitle: course.title,
                          lessonTitle: lesson.title,
                        },
                      })
                    }
                  >
                    Play
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="course-footer">
        <button
          type="button"
          className="certificate-button"
          onClick={() =>
            navigate('/certificate', {
              state: {
                courseTitle: course.title,
                certificateId: course.certificateId || 'SK24568086',
              },
            })
          }
        >
          <img src="/assets/my_courses/certificate.svg" alt="Certificate" />
        </button>
        <button
          type="button"
          className="primary-pill"
          onClick={() => navigate('/course-detail', { state: { course } })}
        >
          <span>Start Course Again</span>
          <span className="primary-pill__arrow">&gt;</span>
        </button>
      </div>
    </div>
  );
}
