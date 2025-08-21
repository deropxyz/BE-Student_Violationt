const express = require("express");
const router = express.Router();
const {
  getGuruDashboard,
  getMyClassStudents,
  getClassStatistics,
} = require("../controllers/guru/dashboard.controller");
const {
  getMyReports,
  getProfile,
  updateProfile,
  getViolations,
  getAchievements,
  searchStudents,
  getCurrentAcademicYear,
  getAcademicYears,
  getMyReportsByAcademicYear,
  getAcademicYearStats,
} = require("../controllers/guru/teacher.controller");
const {
  createStudentReport,
} = require("../controllers/Master/report.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// Dashboard routes with authentication
router.get("/dashboard", authenticate, getGuruDashboard);
router.get("/my-class-students", authenticate, getMyClassStudents);
router.get("/class-statistics", authenticate, getClassStatistics);

// Reporting routes
router.post("/report-student", authenticate, createStudentReport);
router.get("/my-reports", authenticate, getMyReports);

// Academic Year specific routes
router.get(
  "/reports-by-academic-year",
  authenticate,
  getMyReportsByAcademicYear
);
router.get("/academic-year-stats", authenticate, getAcademicYearStats);

// Profile routes
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);

// Data for reporting
router.get("/violations", authenticate, getViolations);
router.get("/achievements", authenticate, getAchievements);
router.get("/search-students", authenticate, searchStudents);

// Academic Year routes
router.get("/academic-years", authenticate, getAcademicYears);
router.get("/current-academic-year", authenticate, getCurrentAcademicYear);

module.exports = router;
