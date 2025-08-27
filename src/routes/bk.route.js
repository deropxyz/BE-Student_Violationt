const express = require("express");
const router = express.Router();
const {
  getClassroomWithReports,
  getStudents,
  getStudentDetailBK,
  searchStudents,
  createPointAdjustment,
  getAllPointAdjustments,
  getAdjustmentStatistics,
  getStudentsForMonitoring,
  getStudentMonitoringDetail,
  getPointAdjustmentDetail,
  updatePointAdjustment,
} = require("../controllers/bk/monitoring.controller");

const {
  getDashboardSummary,
  getRecentViolations,
} = require("../controllers/bk/dashboard.controller");

const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// BK Dashboard and Monitoring Routes
router.get("/classrooms", authenticate, getClassroomWithReports);
router.get("/classrooms/:classroomId/students", authenticate, getStudents);
router.get("/students/:nisn", authenticate, getStudentDetailBK);
router.get("/students", authenticate, searchStudents); // /api/bk/students?q=namaAtauNisn

// Dashboard Routes
router.get("/dashboard/summary", authenticate, getDashboardSummary);
router.get("/dashboard/recent-violations", authenticate, getRecentViolations);

// Point Adjustment Routes
router.get(
  "/monitoring/students",
  authenticate,
  requireRole("bk"),
  getStudentsForMonitoring
);
router.get(
  "/monitoring/students/:studentId",
  authenticate,
  requireRole("bk"),
  getStudentMonitoringDetail
);
const upload = require("../middlewares/upload.middleware");
router.post(
  "/students/:studentId/adjust-points",
  authenticate,
  requireRole("bk"),
  upload.single("bukti"),
  createPointAdjustment
);
router.get(
  "/adjustments",
  authenticate,
  requireRole("bk"),
  getAllPointAdjustments
);
router.get(
  "/adjustments/statistics",
  authenticate,
  requireRole("bk"),
  getAdjustmentStatistics
);

// Get detail point adjustment
router.get(
  "/adjustments/:id",
  authenticate,
  requireRole("bk"),
  getPointAdjustmentDetail
);

// Update point adjustment (alasan, keterangan, bukti)
router.put(
  "/adjustments/:id",
  authenticate,
  requireRole("bk"),
  upload.single("bukti"),
  updatePointAdjustment
);

module.exports = router;
