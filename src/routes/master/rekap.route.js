const express = require("express");
const router = express.Router();

const {
  exportLaporan,
  exportPoinSiswa,
  exportRekapLaporanSiswa,
  previewLaporan,
  getRekapOptions,
  previewPoinSiswa,
  getTahunAjaran,
  getTahunAjaranNonAktif,
} = require("../../controllers/Master/rekap.controller");

router.get("/laporan", exportLaporan);
router.get("/poin-siswa", exportPoinSiswa);
router.get("/rekap-laporan-siswa", exportRekapLaporanSiswa);
router.get("/preview-laporan", previewLaporan);
router.get("/options", getRekapOptions);
router.get("/preview-poin-siswa", previewPoinSiswa);
router.get("/tahun-ajaran", getTahunAjaran);
router.get("/tahun-nonaktif", getTahunAjaranNonAktif);

module.exports = router;
