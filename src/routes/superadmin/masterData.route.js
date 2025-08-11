const express = require("express");
const router = express.Router();

const {
  getAllClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getAllTeachers,
  getAllAngkatan,
  getAngkatanById,
  createAngkatan,
  updateAngkatan,
  deleteAngkatan,
} = require("../../controllers/superadmin/masterData.controller");
const {
  authenticate,
  requireRole,
} = require("../../middlewares/auth.middleware");

router.get(
  "/classrooms",
  authenticate,
  requireRole("superadmin"),
  getAllClassrooms
);
router.get(
  "/classrooms/:id",
  authenticate,
  requireRole("superadmin"),
  getClassroomById
);
router.post(
  "/classrooms",
  authenticate,
  requireRole("superadmin"),
  createClassroom
);
router.put(
  "/classrooms/:id",
  authenticate,
  requireRole("superadmin"),
  updateClassroom
);
router.delete(
  "/classrooms/:id",
  authenticate,
  requireRole("superadmin"),
  deleteClassroom
);
router.get(
  "/teachers",
  authenticate,
  requireRole("superadmin"),
  getAllTeachers
);
router.get(
  "/angkatan",
  authenticate,
  requireRole("superadmin"),
  getAllAngkatan
);
router.get(
  "/angkatan/:id",
  authenticate,
  requireRole("superadmin"),
  getAngkatanById
);
router.post(
  "/angkatan",
  authenticate,
  requireRole("superadmin"),
  createAngkatan
);
router.put(
  "/angkatan/:id",
  authenticate,
  requireRole("superadmin"),
  updateAngkatan
);
router.delete(
  "/angkatan/:id",
  authenticate,
  requireRole("superadmin"),
  deleteAngkatan
);

module.exports = router;
