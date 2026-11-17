const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { sendInquiryEmail } = require("../utils/mailer");

// POST /api/inquiries
router.post("/", async (req, res) => {
  const { phone, email, message, items } = req.body;
  const customer_name = String(req.body.customer_name || "").trim();

  if (!customer_name)
    return res.status(400).json({ error: "Name is required" });
  if (!phone && !email) {
    return res
      .status(400)
      .json({ error: "Please provide a phone number or an email" });
  }

  // Merge duplicate sizes and clean up quantities
  const wanted = new Map();
  for (const it of Array.isArray(items) ? items : []) {
    const sizeId = Number(it.size_id);
    if (!Number.isInteger(sizeId) || sizeId < 1) continue;
    const qty = Math.max(parseInt(it.quantity, 10) || 1, 1);
    wanted.set(sizeId, Math.min((wanted.get(sizeId) || 0) + qty, 100));
  }
  if (wanted.size === 0)
    return res.status(400).json({ error: "Your selection is empty" });
  if (wanted.size > 50)
    return res.status(400).json({ error: "Too many items in one inquiry" });

  let conn;
  try {
    // Look up the real frame, price and stock for every requested size
    const [rows] = await db.query(
      `SELECT s.id, s.frame_id, s.size_label, s.price, s.stock, f.name AS frame_name
       FROM frame_sizes s
       JOIN frames f ON f.id = s.frame_id
       WHERE s.id IN (?) AND f.is_available = TRUE`,
      [[...wanted.keys()]],
    );
    const found = new Map(rows.map((r) => [r.id, r]));

    const changed = [...wanted].some(([sizeId, qty]) => {
      const r = found.get(sizeId);
      return !r || r.stock <= 0 || qty > r.stock;
    });
    if (changed) {
      return res.status(409).json({
        error:
          "Some items in your selection are no longer available or have limited stock. Please review your selection and try again.",
      });
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO inquiries (customer_name, phone, email, message) VALUES (?, ?, ?, ?)",
      [customer_name, phone || null, email || null, message || null],
    );

    for (const [sizeId, qty] of wanted) {
      const r = found.get(sizeId);
      await conn.query(
        "INSERT INTO inquiry_items (inquiry_id, frame_id, size_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)",
        [result.insertId, r.frame_id, sizeId, qty, r.price],
      );
    }

    await conn.commit();

    // The inquiry is saved. Now tell the shop owner. Not awaited, and a failure
    // here must never affect the customer, so it is only logged.
    sendInquiryEmail({
      id: result.insertId,
      customer_name,
      phone,
      email,
      message,
      items: [...wanted].map(([sizeId, qty]) => {
        const r = found.get(sizeId);
        return {
          frame_name: r.frame_name,
          size_label: r.size_label,
          quantity: qty,
          price: r.price,
        };
      }),
    }).catch((err) => console.error("Inquiry email failed:", err.message));

    res
      .status(201)
      .json({ message: "Inquiry sent", inquiryId: result.insertId });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Could not save your inquiry" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
