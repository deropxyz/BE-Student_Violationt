const express = require("express");
const router = express.Router();
const {
  authenticate,
  isSuperadmin,
} = require("../middlewares/auth.middleware");
const {
  getSuperadminDashboard,
  getSuperadminStatsByAcademicYear,
  getSystemAnalyticsByAcademicYear,
  getAllUsers,
} = require("../controllers/superadmin.controller");

// Dashboard routes
router.get("/dashboard", authenticate, isSuperadmin, getSuperadminDashboard);
router.get(
  "/stats-by-year",
  authenticate,
  isSuperadmin,
  getSuperadminStatsByAcademicYear
);
router.get(
  "/analytics-by-year",
  authenticate,
  isSuperadmin,
  getSystemAnalyticsByAcademicYear
);

// User management
router.get("/users", authenticate, isSuperadmin, getAllUsers);

module.exports = router;
