const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body.folder || "uploads";
    const uploadPath = path.join(__dirname, "../../..", "uploads", folder);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = file.fieldname + "-" + uniqueSuffix + ext;
    cb(null, name);
  },
});

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  // Allow images, documents, and videos
  const allowedTypes = /jpeg|jpg|png|gif|bmp|webp|pdf|doc|docx|mp4|mov|avi|wmv/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Tipe file tidak diizinkan. Hanya gambar, dokumen, dan video yang diperbolehkan."
      )
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Single file upload middleware
const uploadSingle = upload.single("file");

// Upload controller
const uploadFile = async (req, res) => {
  try {
    uploadSingle(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File terlalu besar. Maksimal 5MB.",
          });
        }
        return res.status(400).json({
          success: false,
          error: "Error upload: " + err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }

      // No file uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Tidak ada file yang diupload",
        });
      }

      // Generate file path for frontend
      const folder = req.body.folder || "uploads";
      const filePath = `/uploads/${folder}/${req.file.filename}`;

      res.status(200).json({
        success: true,
        message: "File berhasil diupload",
        filePath: filePath,
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Multiple files upload middleware
const uploadMultiple = upload.array("files", 5); // Max 5 files

// Multiple files upload controller
const uploadFiles = async (req, res) => {
  try {
    uploadMultiple(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "File terlalu besar. Maksimal 5MB per file.",
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            error: "Terlalu banyak file. Maksimal 5 file.",
          });
        }
        return res.status(400).json({
          success: false,
          error: "Error upload: " + err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }

      // No files uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Tidak ada file yang diupload",
        });
      }

      // Generate file paths for frontend
      const folder = req.body.folder || "uploads";
      const uploadedFiles = req.files.map((file) => ({
        filePath: `/uploads/${folder}/${file.filename}`,
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.status(200).json({
        success: true,
        message: `${req.files.length} file berhasil diupload`,
        files: uploadedFiles,
      });
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Delete file controller
const deleteFile = async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "File path diperlukan",
      });
    }

    // Construct full file path
    const fullPath = path.join(__dirname, "../../..", filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: "File tidak ditemukan",
      });
    }

    // Delete file
    fs.unlinkSync(fullPath);

    res.status(200).json({
      success: true,
      message: "File berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// Get file info controller
const getFileInfo = async (req, res) => {
  try {
    const { filePath } = req.params;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "File path diperlukan",
      });
    }

    // Construct full file path
    const fullPath = path.join(__dirname, "../../..", filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: "File tidak ditemukan",
      });
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    const filename = path.basename(fullPath);
    const ext = path.extname(filename);

    res.status(200).json({
      success: true,
      data: {
        filename: filename,
        size: stats.size,
        extension: ext,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      },
    });
  } catch (error) {
    console.error("Get file info error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

module.exports = {
  uploadFile,
  uploadFiles,
  deleteFile,
  getFileInfo,
};
