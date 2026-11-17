require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../config/db");

(async () => {
  const [username, password] = process.argv.slice(2);
  if (!username || !password || password.length < 8) {
    console.log(
      "Usage: node scripts/createAdmin.js <username> <password, min 8 characters>",
    );
    process.exit(1);
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
      [username, hash],
    );
    console.log("Admin created:", username);
  } catch (err) {
    console.log(
      err.code === "ER_DUP_ENTRY"
        ? "That username already exists."
        : err.message,
    );
  }
  process.exit(0);
})();
