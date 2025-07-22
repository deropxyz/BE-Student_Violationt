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
} = require("../controllers/student.controller");

// hanya superadmin yang bisa kelola data
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

router.get("/", getAllSiswa);
router.post("/", createSiswa);
router.put("/:id", updateSiswa);
router.delete("/:id", deleteSiswa);
router.post("/import", upload.single("file"), importSiswa);
module.exports = router;
