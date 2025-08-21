const { PrismaClient } = require("@prisma/client");
const {
  transitionAcademicYear,
  getTargetAcademicYear,
} = require("../utils/academicYearUtils");
const prisma = new PrismaClient();

// Get all academic years
const getAllAcademicYears = async (req, res) => {
  try {
    const academicYears = await prisma.tahunAjaran.findMany({
      orderBy: { tahunMulai: "desc" },
    });

    res.json({
      message: "Academic years retrieved successfully",
      data: academicYears,
    });
  } catch (err) {
    console.error("Error getting academic years:", err);
    res.status(500).json({ error: "Failed to fetch academic years" });
  }
};

// Get current active academic year
const getCurrentAcademicYear = async (req, res) => {
  try {
    const currentYear = await prisma.tahunAjaran.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!currentYear) {
      return res.status(404).json({
        error: "No active academic year found",
      });
    }

    res.json({
      message: "Current academic year retrieved successfully",
      data: currentYear,
    });
  } catch (err) {
    console.error("Error getting current academic year:", err);
    res.status(500).json({ error: "Failed to fetch current academic year" });
  }
};

// Create new academic year (superadmin only)
const createAcademicYear = async (req, res) => {
  const {
    tahunAjaran,
    tahunMulai,
    tahunSelesai,
    tanggalMulai,
    tanggalSelesai,
    isActive,
  } = req.body;

  try {
    // Validate required fields
    if (
      !tahunAjaran ||
      !tahunMulai ||
      !tahunSelesai ||
      !tanggalMulai ||
      !tanggalSelesai
    ) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    // If this academic year is set as active, deactivate others
    if (isActive) {
      await prisma.tahunAjaran.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const newAcademicYear = await prisma.tahunAjaran.create({
      data: {
        tahunAjaran,
        tahunMulai: parseInt(tahunMulai),
        tahunSelesai: parseInt(tahunSelesai),
        tanggalMulai: new Date(tanggalMulai),
        tanggalSelesai: new Date(tanggalSelesai),
        isActive: isActive || false,
      },
    });

    res.status(201).json({
      message: "Academic year created successfully",
      data: newAcademicYear,
    });
  } catch (err) {
    console.error("Error creating academic year:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Academic year already exists" });
    }
    res.status(500).json({ error: "Failed to create academic year" });
  }
};

// Update academic year (superadmin only)
const updateAcademicYear = async (req, res) => {
  const { id } = req.params;
  const {
    tahunAjaran,
    tahunMulai,
    tahunSelesai,
    tanggalMulai,
    tanggalSelesai,
    isActive,
  } = req.body;

  try {
    // Check if academic year exists
    const existingAcademicYear = await prisma.tahunAjaran.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingAcademicYear) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    // If this academic year is set as active, deactivate others
    if (isActive) {
      await prisma.tahunAjaran.updateMany({
        where: {
          isActive: true,
          id: { not: parseInt(id) },
        },
        data: { isActive: false },
      });
    }

    const updatedAcademicYear = await prisma.tahunAjaran.update({
      where: { id: parseInt(id) },
      data: {
        tahunAjaran,
        tahunMulai: tahunMulai ? parseInt(tahunMulai) : undefined,
        tahunSelesai: tahunSelesai ? parseInt(tahunSelesai) : undefined,
        tanggalMulai: tanggalMulai ? new Date(tanggalMulai) : undefined,
        tanggalSelesai: tanggalSelesai ? new Date(tanggalSelesai) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({
      message: "Academic year updated successfully",
      data: updatedAcademicYear,
    });
  } catch (err) {
    console.error("Error updating academic year:", err);
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Academic year already exists" });
    }
    res.status(500).json({ error: "Failed to update academic year" });
  }
};

// Delete academic year (superadmin only)
const deleteAcademicYear = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if academic year exists
    const academicYear = await prisma.tahunAjaran.findUnique({
      where: { id: parseInt(id) },
    });

    if (!academicYear) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    // Check if there are any reports associated with this academic year
    const reportsCount = await prisma.studentReport.count({
      where: {
        tanggal: {
          gte: academicYear.tanggalMulai,
          lte: academicYear.tanggalSelesai,
        },
      },
    });

    if (reportsCount > 0) {
      return res.status(400).json({
        error: "Cannot delete academic year with existing reports",
        reportsCount,
      });
    }

    await prisma.tahunAjaran.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      message: "Academic year deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting academic year:", err);
    res.status(500).json({ error: "Failed to delete academic year" });
  }
};

// Set active academic year (superadmin only)
const setActiveAcademicYear = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if academic year exists
    const academicYear = await prisma.tahunAjaran.findUnique({
      where: { id: parseInt(id) },
    });

    if (!academicYear) {
      return res.status(404).json({ error: "Academic year not found" });
    }

    // Deactivate all academic years
    await prisma.tahunAjaran.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate the selected academic year
    const updatedAcademicYear = await prisma.tahunAjaran.update({
      where: { id: parseInt(id) },
      data: { isActive: true },
    });

    res.json({
      message: "Academic year set as active successfully",
      data: updatedAcademicYear,
    });
  } catch (err) {
    console.error("Error setting active academic year:", err);
    res.status(500).json({ error: "Failed to set active academic year" });
  }
};

// Transition academic year (superadmin only)
const transitionAcademicYearController = async (req, res) => {
  const { newYearId, closeCurrentYear = true } = req.body;

  try {
    if (!newYearId) {
      return res.status(400).json({
        error: "New academic year ID is required",
      });
    }

    // Validate new academic year exists
    const newYear = await prisma.tahunAjaran.findUnique({
      where: { id: parseInt(newYearId) },
    });

    if (!newYear) {
      return res.status(404).json({
        error: "Academic year not found",
      });
    }

    // Perform transition
    const activeYear = await transitionAcademicYear(
      parseInt(newYearId),
      closeCurrentYear
    );

    res.json({
      message: "Academic year transition completed successfully",
      data: activeYear,
    });
  } catch (err) {
    console.error("Error transitioning academic year:", err);
    res.status(500).json({ error: "Failed to transition academic year" });
  }
};

// Get academic year with fallback
const getAcademicYearWithFallback = async (req, res) => {
  const { tahunAjaranId } = req.query;

  try {
    const targetYear = await getTargetAcademicYear(tahunAjaranId);

    res.json({
      message: "Academic year retrieved successfully",
      data: targetYear,
      isActive: targetYear.isActive,
      canCreateReports: targetYear.isActive,
    });
  } catch (err) {
    console.error("Error getting academic year:", err);

    if (err.code === "NO_ACADEMIC_YEAR") {
      return res.status(404).json({
        error: "No academic year available",
        message: "Please create an academic year first",
      });
    }

    if (err.code === "ACADEMIC_YEAR_NOT_FOUND") {
      return res.status(404).json({
        error: "Academic year not found",
      });
    }

    res.status(500).json({ error: "Failed to fetch academic year" });
  }
};

module.exports = {
  getAllAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setActiveAcademicYear,
  transitionAcademicYearController,
  getAcademicYearWithFallback,
};
