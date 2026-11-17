import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, imageUrl, formatPrice } from "../services/api";
import { useSelection } from "../context/SelectionContext";
import { useToast } from "../context/ToastContext";
import usePageTitle from "../hooks/usePageTitle";

export default function FrameDetail() {
  const { id } = useParams();
  const { addItem } = useSelection();
  const toast = useToast();

  const [frame, setFrame] = useState(null);
  const [sizeId, setSizeId] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState("");

  usePageTitle(frame?.name);

  useEffect(() => {
    setFrame(null);
    setError("");
    setActiveImg(0);
    api
      .get(`/frames/${id}`)
      .then((res) => {
        setFrame(res.data);
        const first =
          res.data.sizes.find((s) => s.stock > 0) || res.data.sizes[0];
        setSizeId(first ? first.id : null);
      })
      .catch(() => setError("Frame not found."));
  }, [id]);

  // Close the zoom view with the Escape key
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => e.key === "Escape" && setZoom(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (error) {
    return (
      <>
        <p className="error">{error}</p>
        <Link to="/catalog">← Back to catalog</Link>
      </>
    );
  }
  if (!frame) return <p>Loading...</p>;

  const selectedSize = frame.sizes.find((s) => s.id === sizeId);
  const current = frame.images[activeImg];
  const mainSrc = current ? imageUrl(current.image_url) : null;
  const unavailable = !selectedSize || selectedSize.stock <= 0;

  const handleAdd = () => {
    addItem(selectedSize.id);
    toast(`${frame.name} (${selectedSize.size_label}) added to your selection`);
  };

  return (
    <>
      <Link to="/catalog">← Back to catalog</Link>

      <div className="detail">
        <div>
          {mainSrc ? (
            <img
              src={mainSrc}
              alt={frame.name}
              className="gallery-main"
              onClick={() => setZoom(true)}
            />
          ) : (
            <div className="gallery-main no-img">No image</div>
          )}

          {frame.images.length > 1 && (
            <div className="thumbs">
              {frame.images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  className={`thumb-btn ${i === activeImg ? "active" : ""}`}
                  onClick={() => setActiveImg(i)}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img src={imageUrl(img.image_url)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1>{frame.name}</h1>
          <p className="muted">
            {[frame.material, frame.color].filter(Boolean).join(" · ")}
          </p>
          <p>{frame.description}</p>

          <strong>Size</strong>
          <div className="size-pills">
            {frame.sizes.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`pill ${s.id === sizeId ? "active" : ""}`}
                disabled={s.stock <= 0}
                onClick={() => setSizeId(s.id)}
              >
                {s.size_label}
              </button>
            ))}
          </div>

          {selectedSize && (
            <>
              <p className="price big">{formatPrice(selectedSize.price)}</p>
              <p className="muted">
                {selectedSize.stock <= 0
                  ? "Out of stock"
                  : selectedSize.stock <= 5
                    ? `Only ${selectedSize.stock} left`
                    : "In stock"}
              </p>
            </>
          )}

          <button className="btn" disabled={unavailable} onClick={handleAdd}>
            Add to My Selection
          </button>
        </div>
      </div>

      {zoom && mainSrc && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <img src={mainSrc} alt={frame.name} />
        </div>
      )}
    </>
  );
}
