import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, imageUrl, formatPrice } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function AdminFrames() {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/admin/frames")
      .then((res) => setFrames(res.data))
      .catch(() => setError("Could not load frames"))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const toast = useToast();

  const remove = async (frame) => {
    if (!window.confirm(`Delete "${frame.name}"? This cannot be undone.`))
      return;
    setError("");
    try {
      await api.delete(`/admin/frames/${frame.id}`);
      toast("Frame deleted");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete");
    }
  };

  return (
    <div className="container">
      <div className="admin-head">
        <h1>Frames</h1>
        <Link to="/admin/frames/new" className="btn">
          + Add frame
        </Link>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Category</th>
              <th>From</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {frames.map((f) => (
              <tr key={f.id}>
                <td>
                  {f.image ? (
                    <img src={imageUrl(f.image)} alt="" className="thumb" />
                  ) : (
                    <div className="thumb no-img"></div>
                  )}
                </td>
                <td>{f.name}</td>
                <td>{f.category || "-"}</td>
                <td>
                  {f.price_from != null ? formatPrice(f.price_from) : "-"}
                </td>
                <td>{f.total_stock ?? 0}</td>
                <td>{f.is_available ? "Visible" : "Hidden"}</td>
                <td className="row-actions">
                  <Link to={`/admin/frames/${f.id}`}>Edit</Link>
                  <button className="link-btn" onClick={() => remove(f)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
