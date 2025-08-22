const express = require("express");
const router = express.Router();
const {
  getClassroomWithReports,
  getStudents,
  getStudentDetailBK,
  searchStudents,
} = require("../controllers/bk/monitoring.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// BK Dashboard and Monitoring Routes
router.get("/classrooms", authenticate, getClassroomWithReports);
router.get("/classrooms/:classroomId/students", authenticate, getStudents);
router.get("/students/:nisn", authenticate, getStudentDetailBK);
router.get("/students", authenticate, searchStudents); // /api/bk/students?q=namaAtauNisn

module.exports = router;
