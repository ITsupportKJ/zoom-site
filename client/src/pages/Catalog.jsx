import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import FrameCard from "../components/FrameCard";
import SkeletonGrid from "../components/SkeletonGrid";
import useDebounce from "../hooks/useDebounce";
import usePageTitle from "../hooks/usePageTitle";

export default function Catalog() {
  usePageTitle("Catalog");
  const [params, setParams] = useSearchParams();

  // Dropdown filters live directly in the URL
  const category = params.get("category") || "";
  const size = params.get("size") || "";
  const color = params.get("color") || "";
  const sort = params.get("sort") || "newest";

  // Typed filters: local state, written to the URL after the user pauses typing
  const [search, setSearch] = useState(params.get("search") || "");
  const [minPrice, setMinPrice] = useState(params.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("max_price") || "");
  const dSearch = useDebounce(search);
  const dMin = useDebounce(minPrice);
  const dMax = useDebounce(maxPrice);

  const [categories, setCategories] = useState([]);
  const [options, setOptions] = useState({ sizes: [], colors: [] });
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api
      .get("/categories")
      .then((r) => setCategories(r.data))
      .catch(() => {});
    api
      .get("/frames/filters")
      .then((r) => setOptions(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const put = (k, v) => (v ? next.set(k, v) : next.delete(k));
        put("search", dSearch.trim());
        put("min_price", dMin);
        put("max_price", dMax);
        return next;
      },
      { replace: true },
    );
  }, [dSearch, dMin, dMax]);

  // The URL query is sent straight to the API
  const query = params.toString();
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    api
      .get(`/frames?${query}`)
      .then((res) => {
        if (!ignore) setFrames(res.data);
      })
      .catch(() => {
        if (!ignore) setError("Could not load frames. Is the server running?");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [query]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const hasFilters = Boolean(
    category || size || color || search || minPrice || maxPrice,
  );

  const clearFilters = () => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setParams({}, { replace: true });
  };

  return (
    <>
      <h1>Our Photo Frames</h1>

      <div className="catalog-layout">
        <aside className={`filters-panel ${showFilters ? "open" : ""}`}>
          <label>
            Search
            <input
              placeholder="Search frames..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(e) => setFilter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Size
            <select
              value={size}
              onChange={(e) => setFilter("size", e.target.value)}
            >
              <option value="">Any size</option>
              {options.sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label>
            Colour
            <select
              value={color}
              onChange={(e) => setFilter("color", e.target.value)}
            >
              <option value="">Any colour</option>
              {options.colors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            Price range
            <div className="price-row">
              <input
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <input
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </label>

          {hasFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </aside>

        <section>
          <div className="catalog-top">
            <button
              type="button"
              className="btn secondary filter-toggle"
              onClick={() => setShowFilters((s) => !s)}
            >
              {showFilters ? "Hide filters" : "Filters"}
            </button>
            <span className="muted">
              {loading
                ? "Loading..."
                : `${frames.length} frame${frames.length === 1 ? "" : "s"}`}
            </span>
            <select
              value={sort}
              onChange={(e) =>
                setFilter(
                  "sort",
                  e.target.value === "newest" ? "" : e.target.value,
                )
              }
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          {error && <p className="error">{error}</p>}
          {loading && !error && <SkeletonGrid />}

          {!loading && !error && frames.length === 0 && (
            <div className="empty">
              <p>No frames match your filters.</p>
              {hasFilters && (
                <button className="btn" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && frames.length > 0 && (
            <div className="grid">
              {frames.map((f) => (
                <FrameCard key={f.id} frame={f} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
