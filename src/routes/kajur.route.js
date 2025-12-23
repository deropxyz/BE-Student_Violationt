const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getKajurClasses,
  getClassStudents,
  getStudentDetail,
  getStudentReports,
  getAllReports,
} = require("../controllers/kajur/kajur.controller");
const {
  getJurusanInfo,
  previewLaporanKajur,
  exportLaporanKajur,
  previewPoinSiswaKajur,
  exportPoinSiswaKajur,
} = require("../controllers/kajur/export.controller");

// All routes require authentication and guru role (kajur is a guru)
router.use(authenticate);
router.use(requireRole("guru"));

// GET /api/kajur/jurusan-info - Get jurusan info
router.get("/jurusan-info", getJurusanInfo);

// GET /api/kajur/preview-laporan - Preview laporan for export
router.get("/preview-laporan", previewLaporanKajur);

// GET /api/kajur/export-laporan - Export laporan to Excel
router.get("/export-laporan", exportLaporanKajur);

// GET /api/kajur/preview-poin-siswa - Preview poin siswa for export
router.get("/preview-poin-siswa", previewPoinSiswaKajur);

// GET /api/kajur/export-poin-siswa - Export poin siswa to Excel
router.get("/export-poin-siswa", exportPoinSiswaKajur);

// GET /api/kajur/reports - Get all reports in kajur's jurusan
router.get("/reports", getAllReports);

// GET /api/kajur/classes - Get all classes in kajur's jurusan
router.get("/classes", getKajurClasses);

// GET /api/kajur/kelas/:classId/siswa - Get students in a class
router.get("/kelas/:classId/siswa", getClassStudents);

// GET /api/kajur/students/:studentId - Get student detail
router.get("/students/:studentId", getStudentDetail);

// GET /api/kajur/siswa/:studentId - Get student detail (alternative route)
router.get("/siswa/:studentId", getStudentDetail);

// GET /api/kajur/students/:studentId/reports - Get student reports
router.get("/students/:studentId/reports", getStudentReports);

module.exports = router;
