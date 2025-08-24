const express = require("express");
const {
  getAutomasiConfig,
  updateAutomasiConfig,
  getHistorySuratPeringatan,
  getDetailSuratPeringatan,
  manualTriggerSurat,
  updateStatusKirimSurat,
  createAutomasiConfig,
  deleteAutomasiConfig,
} = require("../controllers/bk/automasi.controller");

const { authenticate, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

// ============= ROUTES UNTUK AUTOMASI SURAT PERINGATAN =============

// Get konfigurasi automasi (BK only)
router.get("/config", authenticate, requireRole("bk"), getAutomasiConfig);

router.post("/config", authenticate, requireRole("bk"), createAutomasiConfig);

router.delete(
  "/config/:id",
  authenticate,
  requireRole("bk"),
  deleteAutomasiConfig
);

// Update konfigurasi automasi (BK only)
router.put(
  "/config/:id",
  authenticate,
  requireRole("bk"),
  updateAutomasiConfig
);

// Get history surat peringatan (BK only)
router.get(
  "/history",
  authenticate,
  requireRole("bk", "guru"),
  getHistorySuratPeringatan
);

// Get detail surat peringatan (BK only)
router.get(
  "/surat/:id",
  authenticate,
  requireRole("bk", "guru"),
  getDetailSuratPeringatan
);

// Manual trigger surat peringatan (BK only)
router.post("/trigger", authenticate, requireRole("bk"), manualTriggerSurat);

// Update status kirim surat (BK only)
router.put(
  "/surat/:id/status",
  authenticate,
  requireRole("bk"),
  updateStatusKirimSurat
);

module.exports = router;
