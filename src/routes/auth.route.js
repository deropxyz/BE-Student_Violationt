// src/routes/auth.route.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.login);

module.exports = router;
