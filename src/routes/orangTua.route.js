const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getAllOrangTua,
  createOrangTua,
  updateOrangTua,
  deleteOrangTua,
} = require("../controllers/orangTua.controller");

// CRUD Orang Tua - hanya superadmin
router.get("/", authenticate, requireRole(["superadmin"]), getAllOrangTua);
router.post("/", authenticate, requireRole(["superadmin"]), createOrangTua);
router.put("/:id", authenticate, requireRole(["superadmin"]), updateOrangTua);
router.delete(
  "/:id",
  authenticate,
  requireRole(["superadmin"]),
  deleteOrangTua
);

module.exports = router;
