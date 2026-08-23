require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();

// In production, set FRONTEND_URL to your deployed Vercel frontend URL
// (e.g. https://your-app.vercel.app) to restrict CORS instead of allowing all origins.
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});

// Only start a listening server when run directly (local dev / traditional hosting).
// On Vercel, this file is imported by api/[...slug].js and wrapped as a serverless function instead.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
