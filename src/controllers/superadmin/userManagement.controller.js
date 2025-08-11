const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

// CRUD Users - Only Superadmin
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (role && role !== "all") {
      filter.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: filter,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where: filter }),
    ]);

    res.json({
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("Error getting users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate role
    const allowedRoles = ["guru", "bk", "orangtua"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent updating superadmin
    if (existingUser.role === "superadmin") {
      return res
        .status(403)
        .json({ error: "Cannot update superadmin account" });
    }

    // Check email uniqueness if email is being updated
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }

    const updateData = { name, email, role, isActive };

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent deleting superadmin
    if (existingUser.role === "superadmin") {
      return res
        .status(403)
        .json({ error: "Cannot delete superadmin account" });
    }

    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

const getUserStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      prisma.user.count({ where: { role: "guru" } }),
      prisma.user.count({ where: { role: "bk" } }),
      prisma.user.count({ where: { role: "orangtua" } }),
      prisma.student.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
    ]);

    res.json({
      totalGuru: stats[0],
      totalBK: stats[1],
      totalOrangTua: stats[2],
      totalSiswa: stats[3],
      totalActiveUsers: stats[4],
      totalInactiveUsers: stats[5],
      totalUsers: stats[0] + stats[1] + stats[2] + stats[3] + 1, // +1 for superadmin
    });
  } catch (err) {
    console.error("Error getting user stats:", err);
    res.status(500).json({ error: "Failed to fetch user statistics" });
  }
};

// Import Users from Excel
const importUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const row of data) {
      try {
        const { name, email, password, role } = row;

        // Validate required fields
        if (!name || !email || !password || !role) {
          results.failed++;
          results.errors.push(
            `Row with email ${email || "unknown"}: Missing required fields`
          );
          continue;
        }

        // Validate role
        const allowedRoles = ["guru", "bk", "orangtua"];
        if (!allowedRoles.includes(role)) {
          results.failed++;
          results.errors.push(`Row with email ${email}: Invalid role ${role}`);
          continue;
        }

        // Check if email exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          results.failed++;
          results.errors.push(`Row with email ${email}: Email already exists`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role,
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Row with email ${row.email || "unknown"}: ${error.message}`
        );
      }
    }

    res.json({
      message: "Import completed",
      results,
    });
  } catch (err) {
    console.error("Error importing users:", err);
    res.status(500).json({ error: "Failed to import users" });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  importUsers,
};
