import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, imageUrl } from "../services/api";
import FrameCard from "../components/FrameCard";
import SkeletonGrid from "../components/SkeletonGrid";
import usePageTitle from "../hooks/usePageTitle";
import { SHOP } from "../config";

export default function Home() {
  usePageTitle("");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/frames", { params: { featured: 1, limit: 4 } }),
      api.get("/categories"),
    ])
      .then(([f, c]) => {
        setFeatured(f.data);
        setCategories(c.data.filter((x) => x.frame_count > 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(
      query.trim()
        ? `/catalog?search=${encodeURIComponent(query.trim())}`
        : "/catalog",
    );
  };

  return (
    <>
      <section className="hero">
        <h1>{SHOP.tagline}</h1>
        <p>
          Browse our collection of photo frames, compare sizes and prices, and
          choose your favourites.
        </p>
        <form className="hero-search" onSubmit={search}>
          <input
            placeholder="Search frames (e.g. oak, gold, collage)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn">Search</button>
        </form>
      </section>

      {categories.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Shop by category</h2>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/catalog?category=${c.id}`}
                className="cat-tile"
              >
                {c.image && (
                  <img src={imageUrl(c.image)} alt="" loading="lazy" />
                )}
                <div className="cat-label">
                  <strong>{c.name}</strong>
                  <span>
                    {c.frame_count} frame{c.frame_count > 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>Featured frames</h2>
          <Link to="/catalog">View all →</Link>
        </div>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : featured.length > 0 ? (
          <div className="grid">
            {featured.map((f) => (
              <FrameCard key={f.id} frame={f} />
            ))}
          </div>
        ) : (
          <p className="muted">
            No featured frames yet.{" "}
            <Link to="/catalog">Browse the full catalog</Link>.
          </p>
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>How it works</h2>
        </div>
        <div className="steps">
          <div>
            <span className="step-no">1</span>
            <h3>Browse</h3>
            <p>Filter by size, colour, material and price.</p>
          </div>
          <div>
            <span className="step-no">2</span>
            <h3>Choose</h3>
            <p>Pick your sizes and add frames to My Selection.</p>
          </div>
          <div>
            <span className="step-no">3</span>
            <h3>Send</h3>
            <p>Send us your selection and we'll get back to you.</p>
          </div>
        </div>
      </section>
    </>
  );
}
