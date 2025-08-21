const express = require("express");
const router = express.Router();
const {
  getBKDashboard,
  getStudentsForMonitoring,
  getStudentDetailForBK,
  getViolationTrends,
  getClassrooms,
  getBKDashboardByAcademicYear,
  getViolationTrendsByAcademicYear,
  getStudentsMonitoringByAcademicYear,
  getBKHistoricalStats,
  getBKRecentReports,
} = require("../controllers/bk/monitoring.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// BK Dashboard and Monitoring Routes
router.get("/dashboard", authenticate, getBKDashboard);
router.get("/students", authenticate, getStudentsForMonitoring);
router.get("/students/:studentId", authenticate, getStudentDetailForBK);
router.get("/violation-trends", authenticate, getViolationTrends);
router.get("/classrooms", authenticate, getClassrooms);

// Academic year specific routes
router.get("/dashboard-by-year", authenticate, getBKDashboardByAcademicYear);
router.get(
  "/violation-trends-by-year",
  authenticate,
  getViolationTrendsByAcademicYear
);
router.get(
  "/students-by-year",
  authenticate,
  getStudentsMonitoringByAcademicYear
);

// Historical reports routes for rekap laporan
router.get("/historical-stats", authenticate, getBKHistoricalStats);
router.get("/recent-reports", authenticate, getBKRecentReports);

module.exports = router;
