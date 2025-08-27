const express = require("express");
const router = express.Router();

const {
  exportLaporan,
  exportPoinSiswa,
  exportRekapLaporanSiswa,
  previewLaporan,
  getRekapOptions,
  previewPoinSiswa,
} = require("../../controllers/Master/rekap.controller");

router.get("/laporan", exportLaporan);
router.get("/poin-siswa", exportPoinSiswa);
router.get("/rekap-laporan-siswa", exportRekapLaporanSiswa);
router.get("/preview-laporan", previewLaporan);
router.get("/options", getRekapOptions);
router.get("/preview-poin-siswa", previewPoinSiswa);

module.exports = router;
