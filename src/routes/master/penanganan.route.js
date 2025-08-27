const express = require("express");
const router = express.Router();
const {
  getRiwayatPenangananSiswa,
  getDetailRiwayatPenanganan,
} = require("../../controllers/Master/penanganan.controller");
const {
  authenticate,
  requireRole,
  isBKOrWalikelas,
} = require("../../middlewares/auth.middleware");

// Get riwayat penanganan siswa (dengan filter tahun ajaran)
router.get(
  "/riwayat/:nisn",
  authenticate,
  isBKOrWalikelas,
  getRiwayatPenangananSiswa
);

// Get detail riwayat penanganan by id
router.get(
  "/riwayat/detail/:id",
  authenticate,
  isBKOrWalikelas,
  getDetailRiwayatPenanganan
);

module.exports = router;
