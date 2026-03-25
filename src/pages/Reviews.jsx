import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const FILTERS = [
  { label: 'Excellent', min: 4.5, max: 5 },
  { label: 'Good', min: 4.0, max: 4.49 },
  { label: 'Average', min: 3.0, max: 3.99 },
  { label: 'Below Average', min: 0.0, max: 2.99 },
];

const SEED_REVIEWS = [
  {
    name: 'Heather S. McMullen',
    rating: 4.2,
    body:
      'The Course is Very Good dolor sit amet, consectetur adipiscing elit. Naturales divitias dixit parab les esse..',
    likes: 760,
    time: '2 Weeks Agos',
    liked: true,
  },
  {
    name: 'Natasha B. Lambert',
    rating: 4.8,
    body: 'The Course is Very Good dolor veterm, quo etiam utuntur hi capiamus..',
    likes: 918,
    time: '2 Weeks Agos',
    liked: false,
  },
  {
    name: 'Marshall A. Lester',
    rating: 4.6,
    body:
      'The Course is Very Good dolor sit amet, consectetur adipiscing elit. Naturales divitias dixit parab les esse..',
    likes: 914,
    time: '2 Weeks Agos',
    liked: true,
  },
  {
    name: 'Frances D. Stanford',
    rating: 3.8,
    body: 'The Course is Very Good dolor veterm, quo etiam utuntur hi capiamus..',
    likes: 622,
    time: '3 Weeks Agos',
    liked: false,
  },
  {
    name: 'Mark T. Kelley',
    rating: 2.6,
    body: 'Clear topic structure but needs more practice projects.',
    likes: 124,
    time: '1 Month Ago',
    liked: false,
  },
];

const StarRow = ({ size = 18 }) => (
  <div className="course-reviews__stars">
    {Array.from({ length: 5 }).map((_, index) => (
      <span key={`star-${index}`} style={{ width: size, height: size }} />
    ))}
  </div>
);

const HeartIcon = ({ filled }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden
    className={`course-review__heart ${filled ? 'filled' : ''}`}
  >
    <path
      d="M12 21.4l-1.2-1.1C6.1 16 3 13.2 3 9.6 3 7 5.1 5 7.6 5c1.4 0 2.8.6 3.8 1.6C12.6 5.6 14 5 15.4 5 17.9 5 20 7 20 9.6c0 3.6-3.1 6.4-7.8 10.7L12 21.4z"
      fill="currentColor"
    />
  </svg>
);

const EmojiIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="course-reviews__icon">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="10" r="1.3" fill="currentColor" />
    <circle cx="15" cy="10" r="1.3" fill="currentColor" />
    <path
      d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="course-reviews__icon">
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
    <path
      d="M6 17l4.5-4.5 3 3 2.5-2.5L20 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="course-reviews__send-icon">
    <path
      d="M3 12l18-9-4.5 9L21 21z"
      fill="currentColor"
    />
  </svg>
);

export default function Reviews() {
  const navigate = useNavigate();
  const location = useLocation();
  const course = location.state?.course;
  const fileRef = useRef(null);

  const [reviews, setReviews] = useState(SEED_REVIEWS);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, item) => sum + item.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const filter = FILTERS[selectedFilter];
    return reviews.filter(
      (review) => review.rating >= filter.min && review.rating <= filter.max
    );
  }, [reviews, selectedFilter]);

  useEffect(() => {
    if (!image?.url) return undefined;
    return () => URL.revokeObjectURL(image.url);
  }, [image]);

  const handleLike = (review) => {
    setReviews((prev) =>
      prev.map((item) => {
        if (item !== review) return item;
        const nextLiked = !item.liked;
        return {
          ...item,
          liked: nextLiked,
          likes: nextLiked ? item.likes + 1 : Math.max(0, item.likes - 1),
        };
      })
    );
  };

  const handleToggleComposer = () => {
    setShowComposer((prev) => !prev);
  };

  const handleImagePick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (image?.url) URL.revokeObjectURL(image.url);
    setImage({ file, url: URL.createObjectURL(file) });
  };

  const handleRemoveImage = () => {
    if (image?.url) URL.revokeObjectURL(image.url);
    setImage(null);
  };

  const handleSubmit = () => {
    const value = text.trim();
    if (!value && !image) return;
    setReviews((prev) => [
      {
        name: 'You',
        rating: 4.8,
        body: value || 'Shared a review',
        likes: 0,
        time: 'Just now',
        liked: false,
      },
      ...prev,
    ]);
    setText('');
    handleRemoveImage();
    setSelectedFilter(0);
    setShowComposer(false);
  };

  return (
    <div className="app-shell course-reviews">
      <div className="screen screen--wide course-reviews__screen">
        <div className="course-reviews__header">
          <button
            type="button"
            className="course-reviews__back"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <span className="course-reviews__back-arrow">&lt;</span>
          </button>
          <h2>Reviews</h2>
        </div>
        {course ? (
          <div className="course-reviews__subtitle">For: {course.title}</div>
        ) : null}
        <div className="course-reviews__summary">
          <div className="course-reviews__rating">{averageRating.toFixed(1)}</div>
          <StarRow size={18} />
          <div className="course-reviews__based">
            Based on {reviews.length} Reviews
          </div>
        </div>
        <div className="course-reviews__filters">
          {FILTERS.map((filter, index) => (
            <button
              key={filter.label}
              type="button"
              className={`course-reviews__filter ${
                selectedFilter === index ? 'active' : ''
              }`}
              onClick={() => setSelectedFilter(index)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {showComposer ? (
          <div className="course-reviews__composer">
            <div className="course-reviews__composer-row">
              <div className="course-reviews__avatar" />
              <textarea
                rows={2}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Write your review..."
              />
              <button
                type="button"
                className="course-reviews__icon-btn"
                onClick={() => {}}
                aria-label="Emoji"
              >
                <EmojiIcon />
              </button>
              <button
                type="button"
                className="course-reviews__icon-btn"
                onClick={() => fileRef.current?.click()}
                aria-label="Image"
              >
                <ImageIcon />
              </button>
              <button
                type="button"
                className="course-reviews__send"
                onClick={handleSubmit}
                aria-label="Send"
              >
                <SendIcon />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="course-reviews__file"
            />
            {image ? (
              <div className="course-reviews__preview">
                <img src={image.url} alt="Preview" />
                <button
                  type="button"
                  className="course-reviews__preview-close"
                  onClick={handleRemoveImage}
                >
                  x
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="course-reviews__list">
          {filteredReviews.map((review, index) => (
            <div key={`${review.name}-${index}`} className="course-review-card">
              <div className="course-review-avatar" />
              <div className="course-review-body">
                <div className="course-review-top">
                  <div className="course-review-name">{review.name}</div>
                  <div className="course-review-rating">
                    <span className="course-review-rating__star" />
                    {review.rating.toFixed(1)}
                  </div>
                </div>
                <div className="course-review-text">{review.body}</div>
                <div className="course-review-meta">
                  <button
                    type="button"
                    className={`course-review-like ${
                      review.liked ? 'liked' : ''
                    }`}
                    onClick={() => handleLike(review)}
                    aria-label="Like"
                  >
                    <HeartIcon filled={review.liked} />
                  </button>
                  <span>{review.likes}</span>
                  <span>{review.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="course-reviews__cta">
        <button
          type="button"
          className="course-reviews__cta-btn"
          onClick={handleToggleComposer}
        >
          <span>Write a Review</span>
          <span className="course-reviews__cta-arrow">&gt;</span>
        </button>
      </div>
    </div>
  );
}
