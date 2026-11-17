import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelection } from "../context/SelectionContext";
import { useToast } from "../context/ToastContext";
import { api, imageUrl, formatPrice } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import { SHOP } from "../config";

export default function MySelection() {
  usePageTitle("My Selection");
  const { items, removeItem, updateQuantity, clearSelection } = useSelection();
  const toast = useToast();

  const [details, setDetails] = useState({}); // sizeId -> live data from the server
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Always read the latest items inside the async callback below
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Reload live data when the SET of frames changes (not when a quantity changes)
  const idsKey = items
    .map((i) => i.sizeId)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!idsKey) {
      setLoading(false);
      return;
    }
    let ignore = false;
    setLoadError("");

    api
      .post("/selection/resolve", { size_ids: idsKey.split(",").map(Number) })
      .then((res) => {
        if (ignore) return;
        const map = {};
        res.data.items.forEach((d) => {
          map[d.size_id] = d;
        });
        setDetails(map);

        // Remove frames that were deleted or hidden since they were added
        const gone = idsKey
          .split(",")
          .map(Number)
          .filter((id) => !map[id]);
        gone.forEach((id) => removeItem(id));
        if (gone.length > 0) {
          toast(
            `${gone.length} item${gone.length > 1 ? "s were" : " was"} no longer available and removed from your selection`,
            "error",
          );
        }

        // Reduce quantities that are higher than the stock now available
        let reduced = false;
        res.data.items.forEach((d) => {
          const it = itemsRef.current.find((i) => i.sizeId === d.size_id);
          if (it && d.stock > 0 && it.quantity > d.stock) {
            updateQuantity(d.size_id, d.stock);
            reduced = true;
          }
        });
        if (reduced)
          toast(
            "Some quantities were reduced to match available stock",
            "error",
          );
      })
      .catch(() => {
        if (!ignore) setLoadError("Could not load the latest prices.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [idsKey, refreshKey]);

  const rows = items
    .filter((i) => details[i.sizeId])
    .map((i) => {
      const d = details[i.sizeId];
      return {
        ...i,
        ...d,
        price: Number(d.price),
        status: d.stock > 0 ? "ok" : "out",
      };
    });

  const sendable = rows.filter((r) => r.status === "ok");
  const hasOut = rows.some((r) => r.status === "out");
  const total = sendable.reduce((sum, r) => sum + r.price * r.quantity, 0);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const whatsappLink = () => {
    const lines = sendable.map(
      (r) =>
        `• ${r.quantity} × ${r.name} (${r.size_label}) — ${formatPrice(r.price)}`,
    );
    const text = `Hello! I'd like to ask about these frames:\n\n${lines.join("\n")}\n\nEstimated total: ${formatPrice(total)}`;
    return `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasOut)
      return setError("Please remove the out-of-stock items to continue.");
    setError("");
    setSending(true);
    try {
      await api.post("/inquiries", {
        ...form,
        items: sendable.map((r) => ({
          size_id: r.sizeId,
          quantity: r.quantity,
        })),
      });
      clearSelection();
      setDone(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
      if (err.response?.status === 409) setRefreshKey((k) => k + 1); // reload the latest data
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="success">
        <h1>Thank you!</h1>
        <p>We received your selection and will contact you soon.</p>
        <Link to="/catalog" className="btn">
          Back to catalog
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <h1>My Selection</h1>
        <p>You haven't chosen any frames yet.</p>
        <Link to="/catalog" className="btn">
          Browse frames
        </Link>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <h1>My Selection</h1>
        <p className="error">{loadError}</p>
        <button
          className="btn"
          onClick={() => {
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
        >
          Try again
        </button>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <h1>My Selection</h1>
        <div className="sk sk-row" />
        <div className="sk sk-row" />
      </>
    );
  }

  return (
    <>
      <h1>My Selection</h1>

      <div className="selection-layout">
        <div>
          {rows.map((r) => (
            <div
              key={r.sizeId}
              className={`sel-row ${r.status === "out" ? "out" : ""}`}
            >
              {r.image ? (
                <img
                  src={imageUrl(r.image)}
                  alt={r.name}
                  className="sel-img"
                  loading="lazy"
                />
              ) : (
                <div className="sel-img no-img">No image</div>
              )}

              <div className="sel-info">
                <Link to={`/frames/${r.frame_id}`}>
                  <strong>{r.name}</strong>
                </Link>
                <span className="muted">Size: {r.size_label}</span>
                <span className={`price ${r.status === "out" ? "struck" : ""}`}>
                  {formatPrice(r.price)}
                </span>
                {r.status === "out" && (
                  <span className="out-note">
                    Out of stock. Remove it to continue.
                  </span>
                )}
                {r.status === "ok" && r.stock <= 5 && (
                  <span className="out-note">Only {r.stock} available</span>
                )}
              </div>

              <div className="sel-actions">
                {r.status === "ok" && (
                  <input
                    type="number"
                    min="1"
                    max={r.stock}
                    value={r.quantity}
                    onChange={(e) => {
                      const q = parseInt(e.target.value, 10) || 1;
                      updateQuantity(r.sizeId, Math.min(q, r.stock));
                    }}
                  />
                )}
                <button
                  className="link-btn"
                  onClick={() => removeItem(r.sizeId)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <p className="total">Estimated total: {formatPrice(total)}</p>
          <p className="price-note">
            Prices are current. The shop confirms the final price.
          </p>

          {SHOP.whatsapp && sendable.length > 0 && (
            <a
              className="btn whatsapp"
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Send via WhatsApp
            </a>
          )}
        </div>

        <form className="inquiry-form" onSubmit={handleSubmit}>
          <h2>Send your inquiry</h2>
          <input
            name="customer_name"
            placeholder="Your name *"
            value={form.customer_name}
            onChange={handleChange}
            required
          />
          <input
            name="phone"
            placeholder="Phone number"
            value={form.phone}
            onChange={handleChange}
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          <textarea
            name="message"
            rows="4"
            placeholder="Message (optional)"
            value={form.message}
            onChange={handleChange}
          />
          {error && <p className="error">{error}</p>}
          <button
            className="btn"
            disabled={sending || hasOut || sendable.length === 0}
          >
            {sending ? "Sending..." : "Send inquiry"}
          </button>
        </form>
      </div>
    </>
  );
}
