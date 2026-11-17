const express = require("express");
const router = express.Router();
const db = require("../config/db");

const num = (v) =>
  v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;

// Only these sort options are allowed (never put user text into ORDER BY)
const SORTS = {
  newest: "f.created_at DESC",
  price_asc: "price_from ASC",
  price_desc: "price_from DESC",
  name: "f.name ASC",
};

// GET /api/frames/filters: options for the filter sidebar (keep above '/:id')
router.get("/filters", async (req, res) => {
  try {
    const [sizes] = await db.query(
      `SELECT DISTINCT s.size_label FROM frame_sizes s
       JOIN frames f ON f.id = s.frame_id
       WHERE f.is_available = TRUE ORDER BY s.size_label`,
    );
    const [colors] = await db.query(
      `SELECT DISTINCT color FROM frames
       WHERE is_available = TRUE AND color IS NOT NULL AND color <> '' ORDER BY color`,
    );
    const [[range]] = await db.query(
      `SELECT MIN(s.price) AS min_price, MAX(s.price) AS max_price FROM frame_sizes s
       JOIN frames f ON f.id = s.frame_id WHERE f.is_available = TRUE`,
    );

    res.json({
      sizes: sizes.map((r) => r.size_label),
      colors: colors.map((r) => r.color),
      min_price: range.min_price,
      max_price: range.max_price,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/frames?category=&search=&size=&color=&min_price=&max_price=&sort=&featured=1&limit=
router.get("/", async (req, res) => {
  try {
    const { category, search, size, color, sort, featured, limit } = req.query;
    const minPrice = num(req.query.min_price);
    const maxPrice = num(req.query.max_price);

    const where = ["f.is_available = TRUE"];
    const params = [];

    if (category) {
      where.push("f.category_id = ?");
      params.push(category);
    }
    if (search) {
      where.push("(f.name LIKE ? OR f.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (color) {
      where.push("f.color = ?");
      params.push(color);
    }
    if (featured === "1") where.push("f.is_featured = TRUE");

    // Size and price conditions must match the SAME size row
    const sizeConds = [];
    const sizeParams = [];
    if (size) {
      sizeConds.push("fs.size_label = ?");
      sizeParams.push(size);
    }
    if (minPrice !== null) {
      sizeConds.push("fs.price >= ?");
      sizeParams.push(minPrice);
    }
    if (maxPrice !== null) {
      sizeConds.push("fs.price <= ?");
      sizeParams.push(maxPrice);
    }
    if (sizeConds.length) {
      where.push(
        `EXISTS (SELECT 1 FROM frame_sizes fs WHERE fs.frame_id = f.id AND ${sizeConds.join(" AND ")})`,
      );
      params.push(...sizeParams);
    }

    const orderBy = SORTS[sort] || SORTS.newest;
    params.push(Math.min(Math.max(parseInt(limit, 10) || 100, 1), 100));

    const [rows] = await db.query(
      `SELECT f.id, f.name, f.description, f.material, f.color, f.is_featured,
              c.name AS category,
              MIN(s.price) AS price_from,
              COUNT(s.id) AS size_count,
              COALESCE(SUM(s.stock), 0) AS total_stock,
              (SELECT image_url FROM frame_images
               WHERE frame_id = f.id ORDER BY is_primary DESC, id LIMIT 1) AS image
       FROM frames f
       LEFT JOIN categories c ON f.category_id = c.id
       LEFT JOIN frame_sizes s ON s.frame_id = f.id
       WHERE ${where.join(" AND ")}
       GROUP BY f.id, c.name
       ORDER BY ${orderBy}, f.id DESC
       LIMIT ?`,
      params,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/frames/:id: one frame with sizes and images (main photo first)
router.get("/:id", async (req, res) => {
  try {
    const [frames] = await db.query(
      "SELECT * FROM frames WHERE id = ? AND is_available = TRUE",
      [req.params.id],
    );
    if (frames.length === 0)
      return res.status(404).json({ error: "Frame not found" });

    const [sizes] = await db.query(
      "SELECT id, size_label, price, stock FROM frame_sizes WHERE frame_id = ? ORDER BY price",
      [req.params.id],
    );
    const [images] = await db.query(
      "SELECT id, image_url, is_primary FROM frame_images WHERE frame_id = ? ORDER BY is_primary DESC, id",
      [req.params.id],
    );

    res.json({ ...frames[0], sizes, images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
