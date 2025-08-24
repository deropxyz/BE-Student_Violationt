const express = require("express");
const router = express.Router();
const { authenticate, isWalikelas } = require("../middlewares/auth.middleware");

const {
  getStudentsInMyClass,
  getStudentDetailInMyClass,
  getReportsInMyClass,
  checkIsWaliKelas,
} = require("../controllers/guru/walikelas.controller");

router.get("/students", authenticate, isWalikelas, getStudentsInMyClass);
router.get(
  "/students/:nisn",
  authenticate,
  isWalikelas,
  getStudentDetailInMyClass
);
router.get("/reports", authenticate, isWalikelas, getReportsInMyClass);
router.get("/check", authenticate, isWalikelas, checkIsWaliKelas);

module.exports = router;
