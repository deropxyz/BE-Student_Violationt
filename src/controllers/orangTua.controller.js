const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all orang tua
const getAllOrangTua = async (req, res) => {
  try {
    const orangTua = await prisma.orangTua.findMany({
      include: {
        user: true,
        children: {
          include: {
            user: true,
            classroom: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });
    res.json(orangTua);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data orang tua" });
  }
};

// Create new orang tua
const createOrangTua = async (req, res) => {
  const { name, email, noHp, alamat, pekerjaan } = req.body;
  const bcrypt = require("bcrypt");
  const defaultPassword = "smkn14@garut";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  try {
    // Validasi email unik
    const emailExist = await prisma.user.findUnique({ where: { email } });
    if (emailExist) {
      return res.status(400).json({ error: "Email sudah digunakan" });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "orangtua",
      },
    });

    const orangTua = await prisma.orangTua.create({
      data: {
        userId: user.id,
        noHp,
        alamat,
        pekerjaan,
      },
    });

    res.status(201).json({ user, orangTua });
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah orang tua" });
  }
};

// Update orang tua
const updateOrangTua = async (req, res) => {
  const { id } = req.params;
  const { name, email, noHp, alamat, pekerjaan } = req.body;

  try {
    // Validasi email unik jika diupdate
    if (email) {
      const emailExist = await prisma.user.findFirst({
        where: {
          email,
          id: { not: parseInt(id) },
        },
      });
      if (emailExist) {
        return res.status(400).json({ error: "Email sudah digunakan" });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email },
    });

    // Update orang tua data
    const orangTua = await prisma.orangTua.findUnique({
      where: { userId: parseInt(id) },
    });

    if (orangTua) {
      await prisma.orangTua.update({
        where: { id: orangTua.id },
        data: { noHp, alamat, pekerjaan },
      });
    }

    res.json({ message: "Orang tua berhasil diupdate", user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: "Gagal update orang tua" });
  }
};

// Delete orang tua
const deleteOrangTua = async (req, res) => {
  const { id } = req.params;
  try {
    // Find orang tua record
    const orangTua = await prisma.orangTua.findUnique({
      where: { userId: parseInt(id) },
    });

    if (orangTua) {
      await prisma.orangTua.delete({ where: { id: orangTua.id } });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Orang tua berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal hapus orang tua" });
  }
};

module.exports = {
  getAllOrangTua,
  createOrangTua,
  updateOrangTua,
  deleteOrangTua,
};
