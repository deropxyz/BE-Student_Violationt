const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getAllAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setActiveAcademicYear,
  transitionAcademicYearController,
  getAcademicYearWithFallback,
} = require("../controllers/academicYear.controller");

// Routes accessible by all authenticated users
router.get("/", authenticate, getAllAcademicYears);
router.get("/current", authenticate, getCurrentAcademicYear);
router.get("/fallback", authenticate, getAcademicYearWithFallback);

// Routes for superadmin only (you may want to add role middleware)
router.post("/", authenticate, createAcademicYear);
router.put("/:id", authenticate, updateAcademicYear);
router.delete("/:id", authenticate, deleteAcademicYear);
router.put("/:id/activate", authenticate, setActiveAcademicYear);
router.post("/transition", authenticate, transitionAcademicYearController);

module.exports = router;
