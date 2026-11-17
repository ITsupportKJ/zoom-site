const express = require("express");
const router = express.Router();
const db = require("../config/db");

// POST /api/selection/resolve  { size_ids: [3, 7] }
// Returns CURRENT details for each size. Hidden or deleted frames are left out.
router.post("/resolve", async (req, res) => {
  try {
    const raw = Array.isArray(req.body.size_ids) ? req.body.size_ids : [];
    const ids = [
      ...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0)),
    ].slice(0, 50);
    if (ids.length === 0) return res.json({ items: [] });

    const [rows] = await db.query(
      `SELECT s.id AS size_id, s.size_label, s.price, s.stock,
              f.id AS frame_id, f.name,
              (SELECT image_url FROM frame_images
               WHERE frame_id = f.id ORDER BY is_primary DESC, id LIMIT 1) AS image
       FROM frame_sizes s
       JOIN frames f ON f.id = s.frame_id
       WHERE s.id IN (?) AND f.is_available = TRUE`,
      [ids],
    );
    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
