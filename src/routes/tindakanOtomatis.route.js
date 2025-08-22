const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getAllTindakanOtomatis,
  createTindakanOtomatis,
  updateTindakanOtomatis,
  deleteTindakanOtomatis,
} = require("../controllers/tindakanOtomatis.controller");

// CRUD Tindakan Otomatis - BK dan superadmin
router.get(
  "/",
  authenticate,
  requireRole("bk", "superadmin"),
  getAllTindakanOtomatis
);
router.post(
  "/",
  authenticate,
  requireRole("bk", "superadmin"),
  createTindakanOtomatis
);
router.put(
  "/:id",
  authenticate,
  requireRole("bk", "superadmin"),
  updateTindakanOtomatis
);
router.delete(
  "/:id",
  authenticate,
  requireRole("bk", "superadmin"),
  deleteTindakanOtomatis
);

module.exports = router;
