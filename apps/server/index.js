// apps/server/index.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./auth/authRoutes");
const driveRoutes = require("./drive/driveRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/auth", authRoutes);
app.use("/drive", driveRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "GDriveBridge Backend",
  });
});

// Server Start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${process.env.BASE_URL}`);
});
