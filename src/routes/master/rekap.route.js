const express = require("express");
const router = express.Router();

const {
  getTahunAjaranNonAktif,
  getLaporanHistori,
  getRekapPerKelas,
  getRekapPerSiswa,
  getTahunAjaran,
} = require("../../controllers/Master/rekap.controller");

router.get("/histori", getLaporanHistori);
router.get("/tahun-nonaktif", getTahunAjaranNonAktif);
router.get("/rekap-per-kelas", getRekapPerKelas);
router.get("/rekap-per-siswa", getRekapPerSiswa);
router.get("/tahun-ajaran", getTahunAjaran);

module.exports = router;
