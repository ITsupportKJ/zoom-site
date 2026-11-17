import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, imageUrl } from "../services/api";
import { useToast } from "../context/ToastContext";

const emptySize = { size_label: "", price: "", stock: 0 };

export default function AdminFrameForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    material: "",
    color: "",
    is_available: true,
    is_featured: false,
  });
  const [sizes, setSizes] = useState([{ ...emptySize }]);
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0); // used to reset the file input
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadFrame = async (imagesOnly = false) => {
    try {
      const { data } = await api.get(`/admin/frames/${id}`);
      setImages(data.images);
      if (imagesOnly) return;
      setForm({
        name: data.name,
        description: data.description || "",
        category_id: data.category_id || "",
        material: data.material || "",
        color: data.color || "",
        is_available: Boolean(data.is_available),
        is_featured: Boolean(data.is_featured),
      });
      setSizes(data.sizes.length ? data.sizes : [{ ...emptySize }]);
    } catch {
      setError("Could not load this frame");
    }
  };

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => {});
    if (isEdit) loadFrame();
  }, [id]);

  const setField = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const setSize = (index, field, value) =>
    setSizes(sizes.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  const addSize = () => setSizes([...sizes, { ...emptySize }]);
  const removeSize = (index) => setSizes(sizes.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const payload = { ...form, sizes };

      if (!isEdit) {
        const { data } = await api.post("/admin/frames", payload);
        navigate(`/admin/frames/${data.id}`); // go to edit page to add photos
        return;
      }

      await api.put(`/admin/frames/${id}`, payload);

      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append("images", f));
        await api.post(`/admin/frames/${id}/images`, fd);
        setFiles([]);
        setFileKey((k) => k + 1);
      }

      await loadFrame();
      setMessage("Saved successfully");
    } catch (err) {
      setError(err.response?.data?.error || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const makePrimary = async (imageId) => {
    await api.put(`/admin/images/${imageId}/primary`);
    loadFrame(true);
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm("Delete this photo?")) return;
    await api.delete(`/admin/images/${imageId}`);
    loadFrame(true);
  };

  const toast = useToast();

  return (
    <div className="container">
      <Link to="/admin">← Back to frames</Link>
      <h1>{isEdit ? "Edit frame" : "Add frame"}</h1>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Name *
          <input name="name" value={form.name} onChange={setField} required />
        </label>

        <label>
          Description
          <textarea
            name="description"
            rows="3"
            value={form.description}
            onChange={setField}
          />
        </label>

        <div className="form-row">
          <label>
            Category
            <select
              name="category_id"
              value={form.category_id}
              onChange={setField}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Material
            <input name="material" value={form.material} onChange={setField} />
          </label>
          <label>
            Color
            <input name="color" value={form.color} onChange={setField} />
          </label>
        </div>

        <label className="check">
          <input
            type="checkbox"
            name="is_available"
            checked={form.is_available}
            onChange={setField}
          />
          Visible to customers
        </label>

        <label className="check">
          <input
            type="checkbox"
            name="is_featured"
            checked={form.is_featured}
            onChange={setField}
          />
          Show on the home page (featured)
        </label>

        <h2>Sizes and prices</h2>
        {sizes.map((s, i) => (
          <div className="size-row" key={s.id || `new-${i}`}>
            <input
              placeholder="Size (e.g. 8x10)"
              value={s.size_label}
              onChange={(e) => setSize(i, "size_label", e.target.value)}
              required
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Price"
              value={s.price}
              onChange={(e) => setSize(i, "price", e.target.value)}
              required
            />
            <input
              type="number"
              min="0"
              placeholder="Stock"
              value={s.stock}
              onChange={(e) => setSize(i, "stock", e.target.value)}
            />
            <button
              type="button"
              className="link-btn"
              disabled={sizes.length === 1}
              onClick={() => removeSize(i)}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn secondary" onClick={addSize}>
          + Add size
        </button>

        <h2>Photos</h2>
        {!isEdit && (
          <p className="muted">
            Save the frame first, then you can add photos.
          </p>
        )}

        {isEdit && (
          <>
            <div className="admin-images">
              {images.map((img) => (
                <div key={img.id} className="admin-img">
                  <img src={imageUrl(img.image_url)} alt="" />
                  {img.is_primary ? (
                    <span className="tag">Main photo</span>
                  ) : (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => makePrimary(img.id)}
                    >
                      Make main
                    </button>
                  )}
                  <button
                    type="button"
                    className="link-btn danger"
                    onClick={() => deleteImage(img.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
              {images.length === 0 && <p className="muted">No photos yet.</p>}
            </div>

            <label>
              Add photos (JPG, PNG or WebP, max 5 MB each)
              <input
                key={fileKey}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
            </label>
          </>
        )}

        {error && <p className="error">{error}</p>}
        {message && <p className="success-text">{message}</p>}

        <button className="btn" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
