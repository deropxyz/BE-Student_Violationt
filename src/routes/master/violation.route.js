const express = require("express");
const router = express.Router();
const {
  authenticate,
  requireRole,
} = require("../../middlewares/auth.middleware");
const {
  getAllViolations,
  getViolationDetail,
  createViolation,
  updateViolation,
  deleteViolation,
} = require("../../controllers/Master/violation.controller");

// Endpoint CRUD data pelanggaran - Admin dan BK
router.get(
  "/",
  authenticate,
  requireRole(["bk", "superadmin", "guru"]),
  getAllViolations
);
router.get(
  "/:id",
  authenticate,
  requireRole(["bk", "superadmin", "guru"]),
  getViolationDetail
);
router.post(
  "/",
  authenticate,
  requireRole(["bk", "superadmin"]),
  createViolation
);
router.put(
  "/:id",
  authenticate,
  requireRole(["bk", "superadmin"]),
  updateViolation
);
router.delete(
  "/:id",
  authenticate,
  requireRole(["bk", "superadmin"]),
  deleteViolation
);

// hanya guru dan bk yang bisa input laporan
router.post("/lapor", authenticate, requireRole(["guru", "bk"]), (req, res) => {
  res.json({
    message: `Laporan diterima oleh ${req.user.role}`,
    userId: req.user.id,
  });
});

module.exports = router;
