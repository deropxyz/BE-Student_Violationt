// src/routes/teacher.route.js
const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

const {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherDetail,
  searchTeacher,
  resetTeacherPassword,
  getMyProfile,
} = require("../controllers/teacher.controller");

// hanya superadmin yang bisa kelola akun guru

router.get("/", getAllTeachers);
router.post("/", createTeacher);
router.put("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);
// Ambil detail guru berdasarkan ID
router.get("/:id", getTeacherDetail);
// Pencarian guru berdasarkan nama atau email
router.get("/search", searchTeacher);
// Reset password guru
router.put("/:id/reset-password", resetTeacherPassword);

// Endpoint untuk guru yang login
router.get("/profile", authenticate, requireRole(["guru"]), getMyProfile);

module.exports = router;
