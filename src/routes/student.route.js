const express = require("express");
const router = express.Router();
const {
  getAllSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
} = require("../controllers/student.controller");

const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// hanya superadmin yang bisa kelola data siswa
router.use(authenticate, requireRole(["superadmin"]));

router.get("/", getAllSiswa);
router.post("/", createSiswa);
router.put("/:id", updateSiswa);
router.delete("/:id", deleteSiswa);

module.exports = router;
