const express = require("express");
const router = express.Router();

const {
  getAllTeachers,
  getAllBK,
  getAllTeachersAndBK,
  getTeacherDetail,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} = require("../../controllers/superadmin/teacherManagement.controller");
const {
  authenticate,
  requireRole,
} = require("../../middlewares/auth.middleware");

// Get all teachers
router.get("/", authenticate, requireRole("superadmin"), getAllTeachers);

// Get all BK counselors
router.get("/bk", authenticate, requireRole("superadmin"), getAllBK);

// Get all teachers and BK combined
router.get(
  "/all",
  authenticate,
  requireRole("superadmin"),
  getAllTeachersAndBK
);

// Get teacher detail by ID
router.get(
  "/:teacherId",
  authenticate,
  requireRole("superadmin"),
  getTeacherDetail
);

// Create new teacher or BK
router.post("/", authenticate, requireRole("superadmin"), createTeacher);

// Update teacher or BK
router.put(
  "/:teacherId",
  authenticate,
  requireRole("superadmin"),
  updateTeacher
);

// Delete teacher or BK
router.delete(
  "/:teacherId",
  authenticate,
  requireRole("superadmin"),
  deleteTeacher
);

module.exports = router;
