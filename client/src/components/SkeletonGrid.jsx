export default function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card skeleton-card">
          <div className="sk sk-img" />
          <div className="card-body">
            <div className="sk sk-line short" />
            <div className="sk sk-line" />
            <div className="sk sk-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}
