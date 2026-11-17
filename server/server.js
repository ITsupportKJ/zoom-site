const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/frames", require("./routes/frames"));
app.use("/api/categories", require("./routes/categories"));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use("/api/selection", require("./routes/selection"));

app.get("/", (req, res) => res.send("Photo frame API is running"));

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`),
);
