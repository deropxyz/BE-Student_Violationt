// src/routes/auth.route.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.login);

// Reset password (admin or forgot password)
router.post("/reset-password", authController.resetPassword);

module.exports = router;
