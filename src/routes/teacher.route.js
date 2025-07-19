// src/routes/teacher.route.js
const express = require("express");
const router = express.Router();

const {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacher.controller");

const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// hanya superadmin yang bisa kelola akun guru
router.use(authenticate, requireRole(["superadmin"]));

router.get("/", getAllTeachers);
router.post("/", createTeacher);
router.put("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);

module.exports = router;
