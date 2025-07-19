const express = require("express");
const router = express.Router();
const {
  authenticate,
  isSuperadmin,
} = require("../middlewares/auth.middleware");

// hanya superadmin yang bisa akses
router.get("/users", authenticate, isSuperadmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data user" });
  }
});

module.exports = router;
