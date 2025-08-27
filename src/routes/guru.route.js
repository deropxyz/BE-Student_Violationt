const express = require("express");
const router = express.Router();
const {
  getDashboardGuru,
  getProfileGuru,
  updateProfileGuru,
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
const upload = require("../middlewares/upload.middleware");

const { authenticate } = require("../middlewares/auth.middleware");

// Dashboard routes with authentication
router.get("/dashboard", authenticate, getDashboardGuru);
router.get("/profile", authenticate, getProfileGuru);
router.put("/profile", authenticate, updateProfileGuru);

// Reporting routes
router.post(
  "/report-student",
  authenticate,
  upload.single("bukti"),
  createStudentReport
);
router.get("/my-reports", authenticate, getMyReports);
router.get("/report-items", authenticate, getReportItemsStructured);
router.get("/search-students", authenticate, searchStudents);
router.get("/categories", authenticate, getCategories);
router.get("/search-report-items", authenticate, searchReportItems);
router.get("/report-detail/:id", authenticate, getReportDetail);

module.exports = router;
