const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
  getAllClassrooms,
  getAllStudents,
  getStudentsByClassroom,
  getStudentDetail,
  createStudent,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
} = require("../../controllers/superadmin/studentManagement.controller");
const {
  authenticate,
  requireRole,
} = require("../../middlewares/auth.middleware");

// Get all classrooms
router.get(
  "/classrooms",
  authenticate,
  requireRole("superadmin"),
  getAllClassrooms
);

// Get all students
router.get(
  "/students",
  authenticate,
  requireRole("superadmin"),
  getAllStudents
);

// Get students by classroom
router.get(
  "/classrooms/:classroomId",
  authenticate,
  requireRole("superadmin"),
  getStudentsByClassroom
);

// Create new student in specific classroom
router.post(
  "/classrooms/:classroomId/students",
  authenticate,
  requireRole("superadmin"),
  createStudent
);

// Get student detail by ID
router.get(
  "/:studentId/detail",
  authenticate,
  requireRole("superadmin"),
  getStudentDetail
);

// Update student by ID
router.put(
  "/:studentId",
  authenticate,
  requireRole("superadmin"),
  updateStudent
);

// Delete student by ID
router.delete(
  "/:studentId",
  authenticate,
  requireRole("superadmin"),
  deleteStudent
);

// Reset student password to default
router.put(
  "/:studentId/reset-password",
  authenticate,
  requireRole("superadmin"),
  resetStudentPassword
);

module.exports = router;
