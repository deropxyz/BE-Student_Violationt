const express = require("express");
const router = express.Router();
const {
  getAllJurusan,
  getJurusanById,
  createJurusan,
  updateJurusan,
  deleteJurusan,
  assignKajur,
  getAvailableTeachers,
  getJurusanStats,
} = require("../controllers/superadmin/jurusan.controller");

const {
  getStudentReportsByJurusan,
  getReportsSummaryByJurusan,
  exportReportsByJurusan,
  getAllJurusan: getAllJurusanForReports,
} = require("../controllers/jurusan/jurusan.controller");

const {
  authenticate,
  requireRole,
  checkJurusanAccess,
} = require("../middlewares/auth.middleware");

// GET /api/jurusan - Get all jurusan with pagination and search
router.get("/", authenticate, requireRole("superadmin"), getAllJurusan);

// GET /api/jurusan/stats - Get jurusan statistics
router.get("/stats", authenticate, requireRole("superadmin"), getJurusanStats);

// GET /api/jurusan/list - Get simple list of jurusan (untuk dropdown/filter)
router.get(
  "/list",
  authenticate,
  requireRole("superadmin", "bk", "guru"),
  getAllJurusanForReports
);

// GET /api/jurusan/available-teachers - Get teachers available for kajur assignment
router.get(
  "/available-teachers",
  authenticate,
  requireRole("superadmin"),
  getAvailableTeachers
);

// GET /api/jurusan/:id - Get jurusan by ID
router.get("/:id", authenticate, requireRole("superadmin"), getJurusanById);

// POST /api/jurusan - Create new jurusan
router.post("/", authenticate, requireRole("superadmin"), createJurusan);

// PUT /api/jurusan/:id - Update jurusan
router.put("/:id", authenticate, requireRole("superadmin"), updateJurusan);

// DELETE /api/jurusan/:id - Delete jurusan
router.delete("/:id", authenticate, requireRole("superadmin"), deleteJurusan);

// POST /api/jurusan/assign-kajur - Assign or remove kajur
router.post(
  "/assign-kajur",
  authenticate,
  requireRole("superadmin"),
  assignKajur
);

// === ROUTES UNTUK REPORTS BERDASARKAN JURUSAN ===
// Routes moved above since /list specific route is already above

// GET /api/jurusan/:jurusanId/reports - Get student reports by jurusan
router.get(
  "/:jurusanId/reports",
  authenticate,
  requireRole("superadmin", "bk", "guru"),
  checkJurusanAccess,
  getStudentReportsByJurusan
);

// GET /api/jurusan/:jurusanId/reports/summary - Get reports summary by jurusan
router.get(
  "/:jurusanId/reports/summary",
  authenticate,
  requireRole("superadmin", "bk", "guru"),
  checkJurusanAccess,
  getReportsSummaryByJurusan
);

// GET /api/jurusan/:jurusanId/reports/export - Export reports by jurusan to Excel
router.get(
  "/:jurusanId/reports/export",
  authenticate,
  requireRole("superadmin", "bk", "guru"),
  checkJurusanAccess,
  exportReportsByJurusan
);

module.exports = router;
