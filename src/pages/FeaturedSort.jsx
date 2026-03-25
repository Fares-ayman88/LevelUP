import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Toast from '../components/Toast.jsx';
import {
  fetchCourses,
  fetchMentors,
  subscribeCourses,
  subscribeMentors,
  saveCourseFeaturedOrder,
  saveMentorFeaturedOrder,
} from '../services/homeData.js';

const reorder = (order, startId, endId) => {
  const current = [...order];
  const startIndex = current.indexOf(startId);
  const endIndex = current.indexOf(endId);
  if (startIndex === -1 || endIndex === -1) return current;
  current.splice(startIndex, 1);
  current.splice(endIndex, 0, startId);
  return current;
};

const normalizeOrder = (order, sourceItems) => {
  const available = new Set(sourceItems.map((item) => item.id));
  const next = order.filter((id) => available.has(id));
  const existing = new Set(next);
  for (const item of sourceItems) {
    if (!existing.has(item.id)) next.push(item.id);
  }
  return next;
};

export default function FeaturedSort() {
  const navigate = useNavigate();
  const [showCourses, setShowCourses] = useState(true);
  const [draggingId, setDraggingId] = useState('');
  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [courseOrder, setCourseOrder] = useState([]);
  const [mentorOrder, setMentorOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [loadedCourses, loadedMentors] = await Promise.all([
        fetchCourses(),
        fetchMentors(),
      ]);
      const nextCourses = loadedCourses || [];
      const nextMentors = loadedMentors || [];
      setCourses(nextCourses);
      setMentors(nextMentors);
      setCourseOrder(nextCourses.map((course) => course.id));
      setMentorOrder(nextMentors.map((mentor) => mentor.id));
    } catch {
      setCourses([]);
      setMentors([]);
      setCourseOrder([]);
      setMentorOrder([]);
      setMessage('Could not load featured data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    let unsubscribeCourses = () => {};
    let unsubscribeMentors = () => {};

    const loadRealtime = async () => {
      if (!isActive) return;
      await loadData({ silent: true });
    };

    void loadData();
    subscribeCourses(() => {
      void loadRealtime();
    }).then((unsubscribe) => {
      unsubscribeCourses = unsubscribe;
    }).catch(() => {});

    subscribeMentors(() => {
      void loadRealtime();
    }).then((unsubscribe) => {
      unsubscribeMentors = unsubscribe;
    }).catch(() => {});

    return () => {
      isActive = false;
      unsubscribeCourses();
      unsubscribeMentors();
    };
  }, []);

  const normalizedCourseOrder = useMemo(
    () => normalizeOrder(courseOrder, courses),
    [courseOrder, courses]
  );
  const normalizedMentorOrder = useMemo(
    () => normalizeOrder(mentorOrder, mentors),
    [mentorOrder, mentors]
  );

  const courseMap = useMemo(
    () => Object.fromEntries(courses.map((course) => [course.id, course])),
    [courses]
  );
  const mentorMap = useMemo(
    () => Object.fromEntries(mentors.map((mentor) => [mentor.id, mentor])),
    [mentors]
  );

  const orderedCourses = normalizedCourseOrder
    .map((id) => courseMap[id])
    .filter(Boolean);
  const orderedMentors = normalizedMentorOrder
    .map((id) => mentorMap[id])
    .filter(Boolean);

  const handleDrop = (id) => {
    if (!draggingId || draggingId === id) return;
    if (showCourses) {
      setCourseOrder((prev) => reorder(prev, draggingId, id));
    } else {
      setMentorOrder((prev) => reorder(prev, draggingId, id));
    }
    setDraggingId('');
  };

  const items = showCourses ? orderedCourses : orderedMentors;

  const handleSave = async () => {
    if (saving || loading) return;
    setSaving(true);
    try {
      if (showCourses) {
        await saveCourseFeaturedOrder(orderedCourses);
        setMessage('Course order saved.');
      } else {
        await saveMentorFeaturedOrder(orderedMentors);
        setMessage('Mentor order saved.');
      }
    } catch (error) {
      setMessage(error?.message || 'Could not save featured order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="featured-sort">
      <div className="screen screen--wide">
        <div className="page-header">
          <button type="button" className="icon-btn" onClick={() => navigate(-1)}>
            <span className="material-icons-round icon-btn__arrow" aria-hidden>arrow_back</span>
          </button>
          <h2>Arrange Home</h2>
        </div>
        <div className="featured-tabs">
          <button
            type="button"
            className={`featured-tab ${showCourses ? 'active' : ''}`}
            onClick={() => setShowCourses(true)}
          >
            Popular Courses
          </button>
          <button
            type="button"
            className={`featured-tab ${!showCourses ? 'active' : ''}`}
            onClick={() => setShowCourses(false)}
          >
            Top Mentors
          </button>
        </div>
        <div className="featured-hint">
          {showCourses
            ? 'Drag to reorder. The first 5 appear in Popular Courses.'
            : 'Drag to reorder. The first 6 appear in Top Mentors.'}
        </div>
        <div className="admin-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={loadData}
            disabled={loading || saving}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            type="button"
            className="primary-pill"
            onClick={handleSave}
            disabled={loading || saving || items.length === 0}
          >
            <span>{saving ? 'Saving...' : 'Save Order'}</span>
            <span className="primary-pill__arrow">&gt;</span>
          </button>
        </div>
        <div className="featured-list">
          {!loading && items.length === 0 ? (
            <div className="empty-state">
              <p>No items to sort.</p>
            </div>
          ) : null}
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`featured-item ${draggingId === item.id ? 'dragging' : ''}`}
              draggable
              onDragStart={() => setDraggingId(item.id)}
              onDragEnd={() => setDraggingId('')}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(item.id)}
            >
              <div className="featured-index">{index + 1}</div>
              <div className="featured-body">
                <strong>{showCourses ? item.title : item.name}</strong>
                <span>{showCourses ? item.category : item.subtitle}</span>
              </div>
              <div className="featured-drag">Drag</div>
            </div>
          ))}
        </div>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
