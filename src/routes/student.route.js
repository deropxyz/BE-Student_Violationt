const express = require("express");
const router = express.Router();
const {
  getAllSiswa,
  createSiswa,
  updateSiswa,
  deleteSiswa,
} = require("../controllers/student.controller");

// hanya superadmin yang bisa kelola data
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

router.get("/", getAllSiswa);
router.post("/", createSiswa);
router.put("/:id", updateSiswa);
router.delete("/:id", deleteSiswa);

module.exports = router;
