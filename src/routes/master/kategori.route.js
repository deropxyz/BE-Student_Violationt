const express = require("express");
const router = express.Router();
const kategoriController = require("../../controllers/Master/kategori.controller");
const {
  authenticate,
  requireRole,
} = require("../../middlewares/auth.middleware");
const { route } = require("./achievement.route");

router.get(
  "/",
  authenticate,
  requireRole("superadmin", "bk"),
  kategoriController.getAllKategori
);
router.post(
  "/",
  authenticate,
  requireRole("superadmin", "bk"),
  kategoriController.createKategori
);
router.get(
  "/:id",
  authenticate,
  requireRole("superadmin", "bk"),
  kategoriController.getKategoriById
);
router.put(
  "/:id",
  authenticate,
  requireRole("superadmin", "bk"),
  kategoriController.updateKategori
);
router.delete(
  "/:id",
  authenticate,
  requireRole("superadmin", "bk"),
  kategoriController.deleteKategori
);
router.get(
  "/tipe/:tipe",
  authenticate,
  requireRole("superadmin", "bk"),
  kategoriController.getKategoriByTipe
);

module.exports = router;
