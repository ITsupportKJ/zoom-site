import { useEffect, useState } from "react";
import { api, formatPrice } from "../services/api";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/inquiries")
      .then((res) => setInquiries(res.data))
      .catch(() => setError("Could not load inquiries"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1>Customer inquiries</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && inquiries.length === 0 && <p>No inquiries yet.</p>}

      {inquiries.map((q) => {
        const total = q.items.reduce(
          (sum, i) => sum + Number(i.price || 0) * i.quantity,
          0,
        );
        return (
          <div key={q.id} className="inquiry-card">
            <div className="inquiry-head">
              <strong>{q.customer_name}</strong>
              <span className="muted">
                {new Date(q.created_at).toLocaleString()}
              </span>
            </div>
            <p>
              {q.phone && <a href={`tel:${q.phone}`}>{q.phone}</a>}
              {q.phone && q.email && " · "}
              {q.email && <a href={`mailto:${q.email}`}>{q.email}</a>}
            </p>
            {q.message && <p className="inquiry-msg">{q.message}</p>}
            <ul>
              {q.items.map((i, idx) => (
                <li key={idx}>
                  {i.quantity} × {i.frame_name} (
                  {i.size_label || "size removed"})
                  {i.price != null && ` — ${formatPrice(i.price)}`}
                </li>
              ))}
            </ul>
            <p className="price">Estimated total: {formatPrice(total)}</p>
          </div>
        );
      })}
    </div>
  );
}
