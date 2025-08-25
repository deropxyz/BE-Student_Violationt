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
} = require("../controllers/bk/monitoring.controller");

const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// BK Dashboard and Monitoring Routes
router.get("/classrooms", authenticate, getClassroomWithReports);
router.get("/classrooms/:classroomId/students", authenticate, getStudents);
router.get("/students/:nisn", authenticate, getStudentDetailBK);
router.get("/students", authenticate, searchStudents); // /api/bk/students?q=namaAtauNisn

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
router.post(
  "/students/:studentId/adjust-points",
  authenticate,
  requireRole("bk"),
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

module.exports = router;
