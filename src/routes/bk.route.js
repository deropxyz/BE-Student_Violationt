const express = require("express");
const router = express.Router();
const {
  getBKDashboard,
  getStudentsForMonitoring,
  getStudentDetailForBK,
  getViolationTrends,
  getClassrooms,
} = require("../controllers/bk/monitoring.controller");
const { authenticate } = require("../middlewares/auth.middleware");

// BK Dashboard and Monitoring Routes
router.get("/dashboard", authenticate, getBKDashboard);
router.get("/students", authenticate, getStudentsForMonitoring);
router.get("/students/:studentId", authenticate, getStudentDetailForBK);
router.get("/violation-trends", authenticate, getViolationTrends);
router.get("/classrooms", authenticate, getClassrooms);

module.exports = router;
