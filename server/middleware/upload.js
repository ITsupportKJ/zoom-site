const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "uploads"),
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per image
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype]
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG or WebP images are allowed")),
});

// Returns clean JSON errors instead of crashing
module.exports = (req, res, next) =>
  upload.array("images", 10)(req, res, (err) => {
    if (!err) return next();
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each image must be under 5 MB"
        : err.message;
    res.status(400).json({ error: msg });
  });
