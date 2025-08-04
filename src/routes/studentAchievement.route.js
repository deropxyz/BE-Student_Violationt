const express = require("express");
const router = express.Router();
const studentAchievementController = require("../controllers/studentAchievement.controller");
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// Semua role bisa lihat laporan prestasi
router.get(
  "/",
  authenticate,
  studentAchievementController.getAllStudentAchievements
);
router.get(
  "/:id",
  authenticate,
  studentAchievementController.getStudentAchievementDetail
);

// Guru dan BK bisa input prestasi siswa
router.post(
  "/",
  authenticate,
  requireRole(["guru", "bk"]),
  studentAchievementController.createStudentAchievement
);

// Guru yang input atau BK bisa update
router.put(
  "/:id",
  authenticate,
  requireRole(["guru", "bk"]),
  studentAchievementController.updateStudentAchievement
);

// Hanya BK dan superadmin yang bisa hapus
router.delete(
  "/:id",
  authenticate,
  requireRole(["bk", "superadmin"]),
  studentAchievementController.deleteStudentAchievement
);

module.exports = router;
