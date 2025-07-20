const express = require("express");
const router = express.Router();
const classroomController = require("../controllers/classroomController");

// hanya superadmin yang bisa kelola data siswa
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
router.use(authenticate, requireRole(["superadmin"]));

// CRUD Kelas
router.get("/", classroomController.getAllClassrooms);
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
