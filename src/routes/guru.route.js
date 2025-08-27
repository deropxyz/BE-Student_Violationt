const express = require("express");
const router = express.Router();
const {
  getGuruDashboard,
  getMyClassStudents,
  getClassStatistics,
} = require("../controllers/guru/dashboard.controller");
const {
  getMyReports,
  getCategories,
  getReportItemsStructured,
  searchStudents,
  searchReportItems,
  getReportDetail,
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
router.get("/report-items", authenticate, getReportItemsStructured);
router.get("/search-students", authenticate, searchStudents);
router.get("/categories", authenticate, getCategories);
router.get("/search-report-items", authenticate, searchReportItems);
router.get("/report-detail/:id", authenticate, getReportDetail);

module.exports = router;
