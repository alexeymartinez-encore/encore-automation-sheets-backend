const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const timesheetRoutes = require("./routes/timesheet");
const miscellaneousRoutes = require("./routes/miscellaneous");
const expenseRoutes = require("./routes/expense");
const adminRoutes = require("./routes/admin");
const eventRoutes = require("./routes/event");
const managerRoutes = require("./routes/manager");

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true, // Required for cookie-based auth
  })
);

// API Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/timesheets", timesheetRoutes);
app.use("/miscellaneous", miscellaneousRoutes);
app.use("/expenses", expenseRoutes);
app.use("/admin", adminRoutes);
app.use("/events", eventRoutes);
app.use("/manager", managerRoutes);

// Global Error Handler
app.use((error, req, res, next) => {
  console.error(error);
  const status = error.statusCode || 500;
  res.status(status).json({ message: error.message, data: error.data });
});

module.exports = app;
