const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

const { authenticate, requireRole } = require("../middlewares/auth.middleware");

// hanya superadmin yang bisa akses
router.use(authenticate, requireRole(["superadmin"]));

router.get("/", getAllUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
