const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getAllStudentViolations,
  getStudentViolationDetail,
  createStudentViolation,
  updateStudentViolation,
  deleteStudentViolation,
} = require("../controllers/studentViolation.controller");

// Guru dan BK bisa input pelanggaran siswa
router.post(
  "/",
  authenticate,
  requireRole(["guru", "bk"]),
  createStudentViolation
);

// BK dan superadmin bisa lihat, update, hapus laporan
router.get(
  "/",
  authenticate,
  requireRole(["bk", "superadmin"]),
  getAllStudentViolations
);
router.get(
  "/:id",
  authenticate,
  requireRole(["bk", "superadmin"]),
  getStudentViolationDetail
);
router.put(
  "/:id",
  authenticate,
  requireRole(["bk", "superadmin"]),
  updateStudentViolation
);

// Approval dan reject pelanggaran siswa oleh BK/superadmin
const {
  approveStudentViolation,
  rejectStudentViolation,
} = require("../controllers/studentViolation.controller");

router.put(
  "/:id/approve",
  authenticate,
  requireRole(["bk", "superadmin"]),
  approveStudentViolation
);
router.put(
  "/:id/reject",
  authenticate,
  requireRole(["bk", "superadmin"]),
  rejectStudentViolation
);
router.delete(
  "/:id",
  authenticate,
  requireRole(["bk", "superadmin"]),
  deleteStudentViolation
);

module.exports = router;
