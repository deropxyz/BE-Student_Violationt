const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getMyDashboard,
  getMyViolations,
  getMyAchievements,
  getMySuratPeringatan,
} = require("../controllers/siswa/dashboard.controller");
const {
  getMyProfile,
  updateMyProfile,
  changePassword,
} = require("../controllers/siswa/profile.controller");
const {
  getMyNotifications,
  markMyNotificationAsRead,
  markAllMyNotificationsAsRead,
  getUnreadNotificationsCount,
} = require("../controllers/siswa/notification.controller");

// Dashboard routes
router.get("/dashboard", authenticate, getMyDashboard);
router.get("/violations", authenticate, getMyViolations);
router.get("/achievements", authenticate, getMyAchievements);
// Detail laporan siswa
const {
  getMyReportDetail,
} = require("../controllers/siswa/dashboard.controller");
router.get("/report/:reportId", authenticate, getMyReportDetail);

// Profile routes
router.get("/profile", authenticate, getMyProfile);
router.put("/profile", authenticate, updateMyProfile);
router.put("/password", authenticate, changePassword);

// Notification routes
router.get("/notifications", authenticate, getMyNotifications);
router.put("/notifications/:id/read", authenticate, markMyNotificationAsRead);
router.put(
  "/notifications/read-all",
  authenticate,
  markAllMyNotificationsAsRead
);
router.get(
  "/notifications/unread-count",
  authenticate,
  getUnreadNotificationsCount
);

router.get("/me/surat-peringatan", authenticate, getMySuratPeringatan);

module.exports = router;
