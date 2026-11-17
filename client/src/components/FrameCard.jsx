import { Link } from "react-router-dom";
import { imageUrl, formatPrice } from "../services/api";

export default function FrameCard({ frame }) {
  const img = imageUrl(frame.image);
  const stock = Number(frame.total_stock || 0);
  const sizes = Number(frame.size_count || 0);

  return (
    <Link to={`/frames/${frame.id}`} className="card">
      <div className="card-media">
        {img ? (
          <img src={img} alt={frame.name} className="card-img" loading="lazy" />
        ) : (
          <div className="card-img no-img">No image</div>
        )}
        {stock === 0 && <span className="badge-stock out">Out of stock</span>}
        {stock > 0 && stock <= 5 && (
          <span className="badge-stock low">Low stock</span>
        )}
      </div>
      <div className="card-body">
        {frame.category && <span className="tag">{frame.category}</span>}
        <h3>{frame.name}</h3>
        <p className="muted">
          {[frame.material, frame.color].filter(Boolean).join(" · ")}
          {sizes > 0 && ` · ${sizes} size${sizes > 1 ? "s" : ""}`}
        </p>
        {frame.price_from != null && (
          <p className="price">From {formatPrice(frame.price_from)}</p>
        )}
      </div>
    </Link>
  );
}
