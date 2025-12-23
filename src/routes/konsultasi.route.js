const express = require("express");
const router = express.Router();
const konsultasiController = require("../controllers/konsultasi.controller");
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// Get all konsultasi (BK only)
router.get(
  "/",
  authenticate,
  requireRole("bk", "superadmin"),
  konsultasiController.getAllKonsultasi
);

// Get konsultasi by ID (BK only)
router.get(
  "/:id",
  authenticate,
  requireRole("bk", "superadmin"),
  konsultasiController.getKonsultasiById
);

// Get konsultasi by student ID (BK and the student themselves can access)
router.get(
  "/siswa/:studentId",
  authenticate,
  konsultasiController.getKonsultasiBySiswa
);

// Create konsultasi (BK only)
router.post(
  "/",
  authenticate,
  requireRole("bk", "superadmin"),
  konsultasiController.createKonsultasi
);

// Update konsultasi (BK only)
router.put(
  "/:id",
  authenticate,
  requireRole("bk", "superadmin"),
  konsultasiController.updateKonsultasi
);

// Delete konsultasi (BK only)
router.delete(
  "/:id",
  authenticate,
  requireRole("bk", "superadmin"),
  konsultasiController.deleteKonsultasi
);

module.exports = router;
