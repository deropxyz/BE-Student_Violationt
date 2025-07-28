const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middlewares/auth.middleware");
const {
  getAllAngkatan,
  createAngkatan,
  updateAngkatan,
  deleteAngkatan,
} = require("../controllers/angkatan.controller");

// CRUD Angkatan - hanya superadmin
router.get("/", authenticate, requireRole(["superadmin"]), getAllAngkatan);
router.post("/", authenticate, requireRole(["superadmin"]), createAngkatan);
router.put("/:id", authenticate, requireRole(["superadmin"]), updateAngkatan);
router.delete(
  "/:id",
  authenticate,
  requireRole(["superadmin"]),
  deleteAngkatan
);

module.exports = router;
