// src/routes/auth.route.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.post("/login", authController.login);

// Reset password (admin or forgot password)
router.post("/reset-password", authController.resetPassword);
router.put("/change-password", authenticate, authController.changePassword);

module.exports = router;
