const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getViolationStatistics,
  getWeeklyViolations,
  getMonthlyViolations,
  getClassViolationReport,
} = require("../controllers/reports.controller");

// Reports - BK, Wali Kelas (guru), dan superadmin
router.get(
  "/statistics",
  authenticate,
  requireRole(["bk", "guru", "superadmin"]),
  getViolationStatistics
);

router.get(
  "/weekly",
  authenticate,
  requireRole(["bk", "superadmin"]),
  getWeeklyViolations
);

router.get(
  "/monthly",
  authenticate,
  requireRole(["bk", "superadmin"]),
  getMonthlyViolations
);

router.get(
  "/class/:classroomId",
  authenticate,
  requireRole(["bk", "guru", "superadmin"]),
  getClassViolationReport
);

module.exports = router;
