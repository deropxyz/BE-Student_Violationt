const express = require("express");
const {
  uploadFile,
  uploadFiles,
  deleteFile,
  getFileInfo,
} = require("../controllers/Master/upload.controller");
const router = express.Router();

// Single file upload endpoint
router.post("/", uploadFile);

// Multiple files upload endpoint
router.post("/multiple", uploadFiles);

// Delete file endpoint
router.delete("/", deleteFile);

// Legacy endpoint for bukti upload (for backward compatibility)
router.post("/bukti", uploadFile);

module.exports = router;
