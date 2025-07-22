const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const {
  getAllSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  importSiswa,
  getDetailSiswa,
  searchSiswa,
  exportSiswa,
} = require("../controllers/student.controller");

// hanya superadmin yang bisa kelola data
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

router.get("/", getAllSiswa);
router.post("/", createSiswa);
router.put("/:id", updateSiswa);
router.delete("/:id", deleteSiswa);
router.post("/import", upload.single("file"), importSiswa);

// Fitur tambahan
router.get("/detail/:id", getDetailSiswa);
router.get("/search", searchSiswa);
router.get("/export", exportSiswa);
module.exports = router;
