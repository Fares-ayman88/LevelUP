export default function Wordmark({ width = 180 }) {
  return (
    <div className="wordmark" style={{ width }}>
      <div className="wordmark__text">
        <span className="wordmark__level">LEVEL</span>
        <span className="wordmark__up">UP</span>
      </div>
      <div className="wordmark__underline" />
    </div>
  );
}
