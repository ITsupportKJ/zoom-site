const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../config/db");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many attempts. Try again in 15 minutes." },
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query("SELECT * FROM admins WHERE username = ?", [
      username || "",
    ]);
    const ok =
      rows.length > 0 &&
      (await bcrypt.compare(password || "", rows[0].password_hash));

    if (!ok)
      return res.status(401).json({ error: "Wrong username or password" });

    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
