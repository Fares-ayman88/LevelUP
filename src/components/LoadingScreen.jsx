export default function LoadingScreen({ label = 'Loading...' }) {
  return (
    <main className="page">
      <div className="loading-card">
        <div className="spinner" />
        <span>{label}</span>
      </div>
    </main>
  );
}
