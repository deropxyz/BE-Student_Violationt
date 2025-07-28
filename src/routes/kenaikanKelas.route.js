const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  generateKenaikanKelas,
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
router.get(
  "/",
  authenticate,
  requireRole(["superadmin", "bk"]),
  getAllKenaikanKelas
);
router.get(
  "/:id",
  authenticate,
  requireRole(["superadmin", "bk"]),
  getKenaikanKelasDetail
);

module.exports = router;
