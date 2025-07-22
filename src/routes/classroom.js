const express = require("express");
const router = express.Router();
const classroomController = require("../controllers/classroom.controller");

// hanya superadmin yang bisa kelola data siswa
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// CRUD Kelas
router.get("/", classroomController.getAllClassroom);

router.post("/", classroomController.createClassroom);
router.put("/:id", classroomController.updateClassroom);
router.delete("/:id", classroomController.deleteClassroom);

// Fitur tambahan
router.get("/:id/students", classroomController.getStudentsInClass);
router.put(
  "/:classroomId/assign/:studentId",
  classroomController.assignStudentToClass
);
router.put("/move-students", classroomController.moveStudentsToNewClass);

module.exports = router;
