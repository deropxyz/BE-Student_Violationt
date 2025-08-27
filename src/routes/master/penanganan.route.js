const express = require("express");
const router = express.Router();
const {
  getRiwayatPenangananSiswa,
  getDetailRiwayatPenanganan,
} = require("../../controllers/Master/penanganan.controller");
const {
  authenticate,
  requireRole,
} = require("../../middlewares/auth.middleware");

// Get riwayat penanganan siswa (dengan filter tahun ajaran)
router.get(
  "/riwayat/:nisn",
  authenticate,
  requireRole("bk", "superadmin"),
  getRiwayatPenangananSiswa
);

// Get detail riwayat penanganan by id
router.get(
  "/riwayat/detail/:id",
  authenticate,
  requireRole("bk", "superadmin"),
  getDetailRiwayatPenanganan
);

module.exports = router;
