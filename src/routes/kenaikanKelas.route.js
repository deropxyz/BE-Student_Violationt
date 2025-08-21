const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  generateKenaikanKelas,
  getPromotionPreview,
  autoDeleteOldGraduates,
  getArchivedStudents,
  getAllKenaikanKelas,
  getKenaikanKelasDetail,
} = require("../controllers/kenaikanKelas.controller");

// Kenaikan Kelas - hanya superadmin
router.post(
  "/generate",
  authenticate,
  requireRole(["superadmin"]),
  generateKenaikanKelas
);

// Preview kenaikan kelas sebelum dieksekusi
router.get(
  "/preview",
  authenticate,
  requireRole(["superadmin"]),
  getPromotionPreview
);

// Auto delete alumni > 1 tahun
router.delete(
  "/auto-delete-graduates",
  authenticate,
  requireRole(["superadmin"]),
  autoDeleteOldGraduates
);

// Get archived students (alumni)
router.get(
  "/archived-students",
  authenticate,
  requireRole(["superadmin", "bk"]),
  getArchivedStudents
);

// Get all kenaikan kelas records
router.get(
  "/",
  authenticate,
  requireRole(["superadmin", "bk"]),
  getAllKenaikanKelas
);

// Get kenaikan kelas detail
router.get(
  "/:id",
  authenticate,
  requireRole(["superadmin", "bk"]),
  getKenaikanKelasDetail
);

module.exports = router;
