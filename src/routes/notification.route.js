const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getStudentNotifications,
  markNotificationAsRead,
  getStudentDashboard,
} = require("../controllers/notification.controller");

// Student dashboard and notifications
router.get(
  "/dashboard/:studentId",
  authenticate,
  requireRole("siswa", "orangtua", "bk", "superadmin"),
  getStudentDashboard
);

router.get(
  "/:studentId",
  authenticate,
  requireRole("siswa", "orangtua", "bk", "superadmin"),
  getStudentNotifications
);

router.put(
  "/read/:id",
  authenticate,
  requireRole("siswa", "orangtua"),
  markNotificationAsRead
);

module.exports = router;
