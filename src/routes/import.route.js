const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  importFromExcel,
  importStudent,
} = require("../controllers/import.controller");

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

module.exports = router;
