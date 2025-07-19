const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// hanya guru dan bk yang bisa input
router.post("/lapor", authenticate, requireRole(["guru", "bk"]), (req, res) => {
  res.json({
    message: `Laporan diterima oleh ${req.user.role}`,
    userId: req.user.id,
  });
});

module.exports = router;
