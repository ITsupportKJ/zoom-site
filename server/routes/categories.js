const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.name,
        (SELECT COUNT(*) FROM frames f
         WHERE f.category_id = c.id AND f.is_available = TRUE) AS frame_count,
        (SELECT fi.image_url FROM frame_images fi
         JOIN frames f ON f.id = fi.frame_id
         WHERE f.category_id = c.id AND f.is_available = TRUE
         ORDER BY fi.is_primary DESC, fi.id LIMIT 1) AS image
      FROM categories c ORDER BY c.name`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
