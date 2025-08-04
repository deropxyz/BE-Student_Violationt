const express = require("express");
const router = express.Router();
const achievementController = require("../controllers/achievement.controller");
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// CRUD Prestasi
router.get("/", achievementController.getAllAchievements);
router.get("/:id", achievementController.getAchievementDetail);

// Hanya superadmin dan guru yang bisa kelola master data prestasi
router.post(
  "/",
  authenticate,
  requireRole(["superadmin", "guru"]),
  achievementController.createAchievement
);
router.put(
  "/:id",
  authenticate,
  requireRole(["superadmin", "guru"]),
  achievementController.updateAchievement
);
router.delete(
  "/:id",
  authenticate,
  requireRole(["superadmin"]),
  achievementController.deleteAchievement
);

module.exports = router;
