const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const { importFromExcel } = require("../controllers/import.controller");

const upload = multer({ dest: "uploads/" });

// Import data dari Excel - hanya superadmin
router.post(
  "/:type",
  authenticate,
  requireRole("superadmin"),
  upload.single("file"),
  importFromExcel
);

module.exports = router;
