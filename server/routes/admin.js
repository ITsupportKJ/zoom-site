const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const auth = require("../middleware/auth");
const uploadImages = require("../middleware/upload");

const router = express.Router();
router.use(auth); // every route below requires a valid login

// Delete an image file from disk (ignore if it is missing)
const removeFile = (url) => {
  if (!url) return;
  fs.unlink(
    path.join(__dirname, "..", "uploads", path.basename(url)),
    () => {},
  );
};

// Validate and clean the frame form data
function cleanFrame(body) {
  const name = (body.name || "").trim();
  if (!name) throw new Error("Frame name is required");

  const sizes = Array.isArray(body.sizes) ? body.sizes : [];
  if (sizes.length === 0) throw new Error("Add at least one size");

  const cleanSizes = sizes.map((s) => {
    const label = (s.size_label || "").trim();
    const price = Number(s.price);
    const stock = parseInt(s.stock, 10);
    if (!label) throw new Error("Every size needs a label");
    if (s.price === "" || s.price == null || !(price >= 0))
      throw new Error("Every size needs a valid price");
    return {
      id: s.id ? Number(s.id) : null,
      size_label: label,
      price,
      stock: stock >= 0 ? stock : 0,
    };
  });

  return {
    name,
    description: body.description || null,
    category_id: body.category_id || null,
    material: body.material || null,
    color: body.color || null,
    is_available: body.is_available ? 1 : 0,
    is_featured: body.is_featured ? 1 : 0,
    sizes: cleanSizes,
  };
}

/* ---------- FRAMES ---------- */

// List all frames (including unavailable ones)
router.get("/frames", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.id, f.name, f.material, f.color, f.is_available, c.name AS category,
             MIN(s.price) AS price_from, SUM(s.stock) AS total_stock,
             (SELECT image_url FROM frame_images
              WHERE frame_id = f.id AND is_primary = TRUE LIMIT 1) AS image
      FROM frames f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN frame_sizes s ON s.frame_id = f.id
      GROUP BY f.id, c.name
      ORDER BY f.created_at DESC`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// One frame with sizes and images
router.get("/frames/:id", async (req, res) => {
  try {
    const [frames] = await db.query("SELECT * FROM frames WHERE id = ?", [
      req.params.id,
    ]);
    if (frames.length === 0)
      return res.status(404).json({ error: "Frame not found" });
    const [sizes] = await db.query(
      "SELECT id, size_label, price, stock FROM frame_sizes WHERE frame_id = ? ORDER BY id",
      [req.params.id],
    );
    const [images] = await db.query(
      "SELECT id, image_url, is_primary FROM frame_images WHERE frame_id = ? ORDER BY id",
      [req.params.id],
    );
    res.json({ ...frames[0], sizes, images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a frame with its sizes
router.post("/frames", async (req, res) => {
  let data;
  try {
    data = cleanFrame(req.body);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      "INSERT INTO frames (category_id, name, description, material, color, is_available, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        data.category_id,
        data.name,
        data.description,
        data.material,
        data.color,
        data.is_available,
        data.is_featured,
      ],
    );
    for (const s of data.sizes) {
      await conn.query(
        "INSERT INTO frame_sizes (frame_id, size_label, price, stock) VALUES (?, ?, ?, ?)",
        [r.insertId, s.size_label, s.price, s.stock],
      );
    }
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Could not create frame" });
  } finally {
    conn.release();
  }
});

// Update a frame and sync its sizes
router.put("/frames/:id", async (req, res) => {
  let data;
  try {
    data = cleanFrame(req.body);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const id = Number(req.params.id);
  const conn = await db.getConnection();
  try {
    const [found] = await conn.query("SELECT id FROM frames WHERE id = ?", [
      id,
    ]);
    if (found.length === 0)
      return res.status(404).json({ error: "Frame not found" });

    await conn.beginTransaction();
    await conn.query(
      "UPDATE frames SET category_id = ?, name = ?, description = ?, material = ?, color = ?, is_available = ?, is_featured = ? WHERE id = ?",
      [
        data.category_id,
        data.name,
        data.description,
        data.material,
        data.color,
        data.is_available,
        data.is_featured,
        id,
      ],
    );

    const [existing] = await conn.query(
      "SELECT id, size_label FROM frame_sizes WHERE frame_id = ?",
      [id],
    );
    const keepIds = data.sizes.filter((s) => s.id).map((s) => s.id);

    for (const s of data.sizes) {
      if (s.id && existing.some((e) => e.id === s.id)) {
        await conn.query(
          "UPDATE frame_sizes SET size_label = ?, price = ?, stock = ? WHERE id = ?",
          [s.size_label, s.price, s.stock, s.id],
        );
      } else {
        await conn.query(
          "INSERT INTO frame_sizes (frame_id, size_label, price, stock) VALUES (?, ?, ?, ?)",
          [id, s.size_label, s.price, s.stock],
        );
      }
    }

    // Remove sizes that were deleted in the form
    for (const e of existing) {
      if (keepIds.includes(e.id)) continue;
      try {
        await conn.query("DELETE FROM frame_sizes WHERE id = ?", [e.id]);
      } catch (err) {
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
          const m = new Error(
            `Size "${e.size_label}" is in past customer inquiries and cannot be deleted. Set its stock to 0 instead.`,
          );
          m.status = 409;
          throw m;
        }
        throw err;
      }
    }

    await conn.commit();
    res.json({ message: "Updated" });
  } catch (err) {
    await conn.rollback();
    if (!err.status) console.error(err);
    res
      .status(err.status || 500)
      .json({ error: err.status ? err.message : "Could not update frame" });
  } finally {
    conn.release();
  }
});

// Delete a frame
router.delete("/frames/:id", async (req, res) => {
  try {
    const [images] = await db.query(
      "SELECT image_url FROM frame_images WHERE frame_id = ?",
      [req.params.id],
    );
    const [r] = await db.query("DELETE FROM frames WHERE id = ?", [
      req.params.id,
    ]);
    if (r.affectedRows === 0)
      return res.status(404).json({ error: "Frame not found" });
    images.forEach((i) => removeFile(i.image_url));
    res.json({ message: "Deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        error:
          "This frame is in past customer inquiries and cannot be deleted. Mark it as unavailable instead.",
      });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- IMAGES ---------- */

// Upload one or more images for a frame
router.post("/frames/:id/images", uploadImages, async (req, res) => {
  const files = req.files || [];
  try {
    const id = Number(req.params.id);
    const [frames] = await db.query("SELECT id FROM frames WHERE id = ?", [id]);
    if (frames.length === 0) {
      files.forEach((f) => removeFile(f.filename));
      return res.status(404).json({ error: "Frame not found" });
    }

    const [primary] = await db.query(
      "SELECT id FROM frame_images WHERE frame_id = ? AND is_primary = TRUE",
      [id],
    );
    let hasPrimary = primary.length > 0;

    for (const f of files) {
      await db.query(
        "INSERT INTO frame_images (frame_id, image_url, is_primary) VALUES (?, ?, ?)",
        [id, `/uploads/${f.filename}`, hasPrimary ? 0 : 1],
      );
      hasPrimary = true; // only the first image becomes the main photo
    }
    res.status(201).json({ message: "Uploaded" });
  } catch (err) {
    files.forEach((f) => removeFile(f.filename));
    console.error(err);
    res.status(500).json({ error: "Could not save images" });
  }
});

// Choose the main photo
router.put("/images/:id/primary", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT frame_id FROM frame_images WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Image not found" });
    await db.query(
      "UPDATE frame_images SET is_primary = (id = ?) WHERE frame_id = ?",
      [req.params.id, rows[0].frame_id],
    );
    res.json({ message: "OK" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete an image
router.delete("/images/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT frame_id, image_url, is_primary FROM frame_images WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Image not found" });

    await db.query("DELETE FROM frame_images WHERE id = ?", [req.params.id]);
    removeFile(rows[0].image_url);

    // If the main photo was deleted, promote another one
    if (rows[0].is_primary) {
      await db.query(
        "UPDATE frame_images SET is_primary = TRUE WHERE frame_id = ? ORDER BY id LIMIT 1",
        [rows[0].frame_id],
      );
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- INQUIRIES ---------- */

router.get("/inquiries", async (req, res) => {
  try {
    const [inquiries] = await db.query(
      "SELECT * FROM inquiries ORDER BY created_at DESC",
    );
    const [items] = await db.query(`
      SELECT ii.inquiry_id, ii.quantity, f.name AS frame_name, s.size_label,
      COALESCE(ii.unit_price, s.price) AS price
      FROM inquiry_items ii
      JOIN frames f ON f.id = ii.frame_id
      LEFT JOIN frame_sizes s ON s.id = ii.size_id`);

    const byInquiry = {};
    items.forEach((i) => (byInquiry[i.inquiry_id] ||= []).push(i));

    res.json(inquiries.map((q) => ({ ...q, items: byInquiry[q.id] || [] })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
