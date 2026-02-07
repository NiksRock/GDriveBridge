// apps/server/index.js

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./auth/authRoutes");
const userInfoRoutes = require("./auth/userInfo");
const driveRoutes = require("./drive/driveRoutes");

const app = express();

/* ✅ 1. CORS MUST COME FIRST */
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

/* ✅ 2. Middleware */
app.use(express.json());
app.use(morgan("dev"));

/* ✅ 3. Routes */
app.use("/auth", authRoutes);
app.use("/auth", userInfoRoutes);
app.use("/drive", driveRoutes);

/* ✅ 4. Health Check */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "GDriveBridge Backend",
  });
});

/* ✅ 5. Start Server */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${process.env.BASE_URL}`);
});
