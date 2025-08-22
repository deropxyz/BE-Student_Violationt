const express = require("express");
const router = express.Router();
const {
  getAllStudentReports,
  getStudentReportById,
  createStudentReport,
  updateStudentReport,
  deleteStudentReport,
  adjustStudentPoints,
  getPointAdjustmentHistory,
  recalculateAllTotalScores,
  getAllStudents,
} = require("../../controllers/Master/report.controller");

const {
  authenticate,
  requireRole,
} = require("../../middlewares/auth.middleware");

router.get(
  "/",
  authenticate,
  requireRole("bk", "superadmin", "guru"),
  getAllStudentReports
);

router.get(
  "/report/:reportId",
  authenticate,
  requireRole("bk", "superadmin"),
  getStudentReportById
);

router.post(
  "/report",
  authenticate,
  requireRole("bk", "superadmin", "guru"),
  createStudentReport
);

router.put(
  "/report/:reportId",
  authenticate,
  requireRole("bk", "superadmin", "guru"),
  updateStudentReport
);

router.delete(
  "/report/:reportId",
  authenticate,
  requireRole("bk", "superadmin"),
  deleteStudentReport
);

// ==================== POINT ADJUSTMENT ROUTES (BK ONLY) ====================

// Adjust student points - Only BK can adjust points
router.post(
  "/adjust-points",
  authenticate,
  requireRole("bk"),
  adjustStudentPoints
);

// Get point adjustment history for a student - BK and Superadmin can view
router.get(
  "/point-history/:studentId",
  authenticate,
  requireRole("bk", "superadmin"),
  getPointAdjustmentHistory
);

// ==================== UTILITY ROUTES ====================

// Recalculate all student total scores - Only superadmin can do this
router.post(
  "/recalculate-scores",
  authenticate,
  requireRole("superadmin"),
  recalculateAllTotalScores
);

// ==================== HELPER ROUTES ====================

// Get all students - Accessible by all authenticated users for report creation
router.get(
  "/students",
  authenticate,
  requireRole("bk", "superadmin", "guru"),
  getAllStudents
);

module.exports = router;
