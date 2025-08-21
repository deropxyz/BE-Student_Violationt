const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Utility function to validate active academic year
const validateActiveAcademicYear = async () => {
  const activeYear = await prisma.tahunAjaran.findFirst({
    where: { isActive: true },
  });

  if (!activeYear) {
    const error = new Error("No active academic year found");
    error.code = "ACADEMIC_YEAR_REQUIRED";
    throw error;
  }

  return activeYear;
};

// Get fallback academic year (active or most recent)
const getFallbackAcademicYear = async () => {
  // Try to get active year first
  let targetYear = await prisma.tahunAjaran.findFirst({
    where: { isActive: true },
  });

  // Fallback to most recent year if no active year
  if (!targetYear) {
    targetYear = await prisma.tahunAjaran.findFirst({
      orderBy: { tahunSelesai: "desc" },
    });
  }

  return targetYear;
};

// Get academic year by ID or fallback
const getTargetAcademicYear = async (tahunAjaranId) => {
  let targetYear;

  if (tahunAjaranId) {
    // User specifically chose a year
    targetYear = await prisma.tahunAjaran.findUnique({
      where: { id: parseInt(tahunAjaranId) },
    });

    if (!targetYear) {
      const error = new Error("Academic year not found");
      error.code = "ACADEMIC_YEAR_NOT_FOUND";
      throw error;
    }
  } else {
    // Use fallback logic
    targetYear = await getFallbackAcademicYear();

    if (!targetYear) {
      const error = new Error("No academic year available");
      error.code = "NO_ACADEMIC_YEAR";
      throw error;
    }
  }

  return targetYear;
};

// Check if academic year allows new reports
const canCreateReports = (academicYear) => {
  return academicYear && academicYear.isActive;
};

// Academic year transition
const transitionAcademicYear = async (newYearId, closeCurrentYear = true) => {
  return await prisma.$transaction(async (tx) => {
    if (closeCurrentYear) {
      // Deactivate all currently active years
      await tx.tahunAjaran.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    // Activate new year
    const newActiveYear = await tx.tahunAjaran.update({
      where: { id: newYearId },
      data: { isActive: true },
    });

    return newActiveYear;
  });
};

module.exports = {
  validateActiveAcademicYear,
  getFallbackAcademicYear,
  getTargetAcademicYear,
  canCreateReports,
  transitionAcademicYear,
};
