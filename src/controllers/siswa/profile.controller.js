const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

// Student Profile Management
const getMyProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const student = await prisma.student.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        nisn: true,
        gender: true,
        tempatLahir: true,
        tglLahir: true,
        alamat: true,
        noHp: true,
        totalScore: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        classroom: {
          select: {
            id: true,
            nama: true,
            waliKelas: {
              select: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        angkatan: {
          select: {
            id: true,
            tahun: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    // Format response dengan data yang diminta
    const response = {
      id: student.id,
      nisn: student.nisn,
      nama: student.user?.name || null,
      email: student.user?.email || null,
      jenisKelamin: student.gender,
      tempatLahir: student.tempatLahir,
      tglLahir: student.tglLahir,
      alamat: student.alamat,
      noHp: student.noHp,
      kelas: student.classroom?.nama || null,
      angkatan: student.angkatan?.tahun || null,
      waliKelas: student.classroom?.waliKelas?.user?.name || null,
      totalScore: student.totalScore,
      classroomId: student.classroom?.id || null,
      angkatanId: student.angkatan?.id || null,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };

    res.json(response);
  } catch (err) {
    console.error("Error getting student profile:", err);
    res.status(500).json({ error: "Gagal mengambil data profil" });
  }
};

const updateMyProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const { name, email, alamat, noHp, tempatLahir, tglLahir } = req.body;

    // Find student by userId
    const student = await prisma.student.findUnique({
      where: { userId: userId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Data siswa tidak ditemukan" });
    }

    // Check email uniqueness if being updated
    if (email && email !== student.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Email sudah digunakan" });
      }
    }

    // Update user data
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email: email || null,
      },
    });

    // Update student data
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        alamat,
        noHp,
        tempatLahir,
        tglLahir: tglLahir ? new Date(tglLahir) : undefined,
      },
      select: {
        id: true,
        nisn: true,
        gender: true,
        tempatLahir: true,
        tglLahir: true,
        alamat: true,
        noHp: true,
        totalScore: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        classroom: {
          select: {
            nama: true,
          },
        },
        angkatan: {
          select: {
            tahun: true,
          },
        },
        updatedAt: true,
      },
    });

    const response = {
      id: updatedStudent.id,
      nisn: updatedStudent.nisn,
      nama: updatedStudent.user?.name || null,
      email: updatedStudent.user?.email || null,
      jenisKelamin: updatedStudent.gender,
      tempatLahir: updatedStudent.tempatLahir,
      tglLahir: updatedStudent.tglLahir,
      alamat: updatedStudent.alamat,
      noHp: updatedStudent.noHp,
      kelas: updatedStudent.classroom?.nama || null,
      angkatan: updatedStudent.angkatan?.tahun || null,
      totalScore: updatedStudent.totalScore,
      updatedAt: updatedStudent.updatedAt,
    };

    res.json({
      message: "Profil berhasil diperbarui",
      data: response,
    });
  } catch (err) {
    console.error("Error updating student profile:", err);
    res.status(500).json({ error: "Gagal memperbarui profil" });
  }
};

const changePassword = async (req, res) => {
  const userId = req.user.id;

  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ error: "Semua field password harus diisi" });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ error: "Konfirmasi password tidak sesuai" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password baru minimal 6 karakter" });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Password saat ini salah" });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    res.json({ message: "Password berhasil diubah" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Gagal mengubah password" });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changePassword,
};
