const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  importFromExcel,
  importStudent,
} = require("../controllers/import.controller");

const {
  importPrestasiHandler,
  importPelanggaran,
} = require("../controllers/superadmin/import.controller");

const { route } = require("./superadmin.route");

const upload = multer({ dest: "uploads/" });

// Import data dari Excel - hanya superadmin

// Import Excel siswa
router.post(
  "/students",
  authenticate,
  requireRole("superadmin"),
  upload.single("file"),
  (req, res) =>
    importFromExcel(
      { ...req, params: { ...req.params, type: "students" } },
      res
    )
);

// route.js
router.post(
  "/prestasi",
  authenticate,
  requireRole("superadmin", "bk"),
  upload.single("file"), // middleware upload di sini
  importPrestasiHandler
);

router.post(
  "/pelanggaran",
  authenticate,
  requireRole("superadmin", "bk"),
  upload.single("file"), // middleware upload di sini
  importPelanggaran
);

module.exports = router;
