const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  importStudents,
  importTeachers,
  importViolations,
} = require("../controllers/superadmin/import.controller");

const upload = multer({ dest: "uploads/" });

// Import data dari Excel - hanya superadmin
router.post(
  "/students",
  authenticate,
  requireRole("superadmin"),
  upload.single("file"),
  importStudents
);

router.post(
  "/teachers",
  authenticate,
  requireRole("superadmin"),
  upload.single("file"),
  importTeachers
);

router.post(
  "/violations",
  authenticate,
  requireRole("superadmin"),
  upload.single("file"),
  importViolations
);

module.exports = router;
