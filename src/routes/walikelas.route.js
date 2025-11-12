const express = require("express");
const router = express.Router();
const { authenticate, isWalikelas } = require("../middlewares/auth.middleware");

const {
  getStudentsInMyClass,
  getStudentDetailInMyClass,
  getReportsInMyClass,
  checkIsWaliKelas,
} = require("../controllers/guru/walikelas.controller");

const {
  getKelasInfo,
  previewLaporanWK,
  exportLaporanWK,
  previewPoinSiswaWK,
  exportPoinSiswaWK,
} = require("../controllers/guru/export.controller");

router.get("/students", authenticate, isWalikelas, getStudentsInMyClass);
router.get(
  "/students/:nisn",
  authenticate,
  isWalikelas,
  getStudentDetailInMyClass
);
router.get("/reports", authenticate, isWalikelas, getReportsInMyClass);
router.get("/check", authenticate, isWalikelas, checkIsWaliKelas);

// Route untuk informasi kelas
router.get("/kelas-info", authenticate, isWalikelas, getKelasInfo);

// Route untuk export laporan
router.get("/preview-laporan", authenticate, isWalikelas, previewLaporanWK);
router.get("/export-laporan", authenticate, isWalikelas, exportLaporanWK);

// Route untuk export poin siswa
router.get(
  "/preview-poin-siswa",
  authenticate,
  isWalikelas,
  previewPoinSiswaWK
);
router.get("/export-poin-siswa", authenticate, isWalikelas, exportPoinSiswaWK);

module.exports = router;
