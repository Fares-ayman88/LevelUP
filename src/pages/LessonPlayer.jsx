import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const extractYouTubeId = (url = '') => {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
};

export default function LessonPlayer() {
  const navigate = useNavigate();
  const location = useLocation();

  const data = useMemo(() => {
    return (
      location.state || {
        sectionTitle: 'Section 01 - Introduction',
        courseTitle: 'Course Name',
        lessonTitle: 'Lesson Preview',
        videoUrl: '',
      }
    );
  }, [location.state]);

  const resolvedVideoUrl = `${data.videoUrl || ''}`.trim();
  const videoId = extractYouTubeId(resolvedVideoUrl);
  const hasUploadedVideo = Boolean(resolvedVideoUrl) && !videoId;
  const headerTitle = data.courseTitle ? `${data.sectionTitle} - ${data.courseTitle}` : data.sectionTitle;

  return (
    <div className="app-shell lesson-player">
      <div className="screen screen--wide">
        <div className="page-header page-header--dark">
          <button type="button" className="icon-btn dark" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <div>
            <h2>{data.lessonTitle}</h2>
            <p>{headerTitle}</p>
          </div>
        </div>

        <div className="video-frame">
          {videoId ? (
            <iframe
              title="Lesson Video"
              src={`https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : hasUploadedVideo ? (
            <video controls playsInline preload="metadata" src={resolvedVideoUrl}>
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="video-empty">
              <strong>No video for this lesson yet.</strong>
              <span>{data.lessonTitle}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
