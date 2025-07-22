const express = require("express");
const router = express.Router();
const {
  getAllBK,
  createBK,
  updateBK,
  deleteBK,
} = require("../controllers/bk.controller");

const { authenticate, requireRole } = require("../middlewares/auth.middleware");

router.get("/", getAllBK);
router.post("/", createBK);
router.put("/:id", updateBK);
router.delete("/:id", deleteBK);

module.exports = router;
