const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getAllViolations,
  getViolationDetail,
  createViolation,
  updateViolation,
  deleteViolation,
} = require("../controllers/violation.controller");

// Endpoint CRUD data pelanggaran
router.get("/", authenticate, requireRole(["bk"]), getAllViolations);
router.get("/:id", authenticate, requireRole(["bk"]), getViolationDetail);
router.post("/", authenticate, requireRole(["bk"]), createViolation);
router.put("/:id", authenticate, requireRole(["bk"]), updateViolation);
router.delete("/:id", authenticate, requireRole(["bk"]), deleteViolation);

// hanya guru dan bk yang bisa input laporan
router.post("/lapor", authenticate, requireRole(["guru", "bk"]), (req, res) => {
  res.json({
    message: `Laporan diterima oleh ${req.user.role}`,
    userId: req.user.id,
  });
});

module.exports = router;
