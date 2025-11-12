const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedKategoriDanItems() {
  console.log("🌱 Seeding kategori dan report items...");

  try {
    // Data Kategori Pelanggaran
    const kategoriPelanggaran = [
      {
        nama: "Pelanggaran Kedisiplinan",
        tipe: "pelanggaran",
        items: [
          { nama: "Terlambat datang ke sekolah", jenis: "Ringan", point: -5 },
          {
            nama: "Tidak menggunakan seragam yang lengkap",
            jenis: "Ringan",
            point: -3,
          },
          {
            nama: "Rambut tidak sesuai aturan sekolah",
            jenis: "Ringan",
            point: -3,
          },
          { nama: "Tidak membawa kartu pelajar", jenis: "Ringan", point: -2 },
          {
            nama: "Tidur di dalam kelas saat pembelajaran",
            jenis: "Sedang",
            point: -10,
          },
          { nama: "Keluar kelas tanpa izin", jenis: "Sedang", point: -8 },
          { nama: "Membolos pelajaran", jenis: "Sedang", point: -15 },
          {
            nama: "Tidak masuk sekolah tanpa keterangan",
            jenis: "Berat",
            point: -20,
          },
        ],
      },
      {
        nama: "Pelanggaran Akademik",
        tipe: "pelanggaran",
        items: [
          { nama: "Tidak mengerjakan tugas", jenis: "Ringan", point: -5 },
          { nama: "Terlambat mengumpulkan tugas", jenis: "Ringan", point: -3 },
          { nama: "Mencontek saat ujian", jenis: "Berat", point: -25 },
          { nama: "Tidak membawa buku pelajaran", jenis: "Ringan", point: -2 },
          { nama: "Tidak mengikuti praktikum", jenis: "Sedang", point: -10 },
          { nama: "Merusak alat praktikum", jenis: "Berat", point: -30 },
        ],
      },
      {
        nama: "Pelanggaran Sosial",
        tipe: "pelanggaran",
        items: [
          { nama: "Berbicara kasar kepada guru", jenis: "Berat", point: -40 },
          { nama: "Berbicara kasar kepada teman", jenis: "Sedang", point: -15 },
          { nama: "Mengganggu ketertiban kelas", jenis: "Sedang", point: -10 },
          { nama: "Berkelahi dengan teman", jenis: "Berat", point: -50 },
          { nama: "Bullying/mengintimidasi teman", jenis: "Berat", point: -60 },
          { nama: "Membawa barang terlarang", jenis: "Berat", point: -45 },
        ],
      },
      {
        nama: "Pelanggaran Teknologi",
        tipe: "pelanggaran",
        items: [
          {
            nama: "Menggunakan HP saat pembelajaran",
            jenis: "Ringan",
            point: -5,
          },
          {
            nama: "Bermain game saat pembelajaran",
            jenis: "Sedang",
            point: -10,
          },
          {
            nama: "Mengakses situs yang tidak pantas",
            jenis: "Berat",
            point: -25,
          },
          {
            nama: "Menyalahgunakan internet sekolah",
            jenis: "Sedang",
            point: -15,
          },
        ],
      },
    ];

    // Data Kategori Prestasi
    const kategoriPrestasi = [
      {
        nama: "Prestasi Akademik",
        tipe: "prestasi",
        items: [
          { nama: "Juara 1 kelas", jenis: "Tingkat Kelas", point: 10 },
          { nama: "Juara 2 kelas", jenis: "Tingkat Kelas", point: 8 },
          { nama: "Juara 3 kelas", jenis: "Tingkat Kelas", point: 6 },
          {
            nama: "Juara 1 tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 20,
          },
          {
            nama: "Juara 2 tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 15,
          },
          {
            nama: "Juara 3 tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 12,
          },
          {
            nama: "Juara 1 olimpiade kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 40,
          },
          {
            nama: "Juara 2 olimpiade kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 30,
          },
          {
            nama: "Juara 3 olimpiade kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 25,
          },
          {
            nama: "Juara 1 olimpiade provinsi",
            jenis: "Tingkat Provinsi",
            point: 60,
          },
          {
            nama: "Juara 2 olimpiade provinsi",
            jenis: "Tingkat Provinsi",
            point: 50,
          },
          {
            nama: "Juara 3 olimpiade provinsi",
            jenis: "Tingkat Provinsi",
            point: 40,
          },
          {
            nama: "Juara 1 olimpiade nasional",
            jenis: "Tingkat Nasional",
            point: 100,
          },
          {
            nama: "Juara 2 olimpiade nasional",
            jenis: "Tingkat Nasional",
            point: 80,
          },
          {
            nama: "Juara 3 olimpiade nasional",
            jenis: "Tingkat Nasional",
            point: 60,
          },
        ],
      },
      {
        nama: "Prestasi Olahraga",
        tipe: "prestasi",
        items: [
          {
            nama: "Juara 1 olahraga tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 15,
          },
          {
            nama: "Juara 2 olahraga tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 12,
          },
          {
            nama: "Juara 3 olahraga tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 10,
          },
          {
            nama: "Juara 1 olahraga kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 35,
          },
          {
            nama: "Juara 2 olahraga kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 25,
          },
          {
            nama: "Juara 3 olahraga kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 20,
          },
          {
            nama: "Juara 1 olahraga provinsi",
            jenis: "Tingkat Provinsi",
            point: 55,
          },
          {
            nama: "Juara 2 olahraga provinsi",
            jenis: "Tingkat Provinsi",
            point: 45,
          },
          {
            nama: "Juara 3 olahraga provinsi",
            jenis: "Tingkat Provinsi",
            point: 35,
          },
          {
            nama: "Juara 1 olahraga nasional",
            jenis: "Tingkat Nasional",
            point: 90,
          },
          {
            nama: "Juara 2 olahraga nasional",
            jenis: "Tingkat Nasional",
            point: 70,
          },
          {
            nama: "Juara 3 olahraga nasional",
            jenis: "Tingkat Nasional",
            point: 50,
          },
        ],
      },
      {
        nama: "Prestasi Seni dan Budaya",
        tipe: "prestasi",
        items: [
          {
            nama: "Juara 1 seni tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 15,
          },
          {
            nama: "Juara 2 seni tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 12,
          },
          {
            nama: "Juara 3 seni tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 10,
          },
          {
            nama: "Juara 1 seni kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 35,
          },
          {
            nama: "Juara 2 seni kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 25,
          },
          {
            nama: "Juara 3 seni kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 20,
          },
          {
            nama: "Juara 1 seni provinsi",
            jenis: "Tingkat Provinsi",
            point: 55,
          },
          {
            nama: "Juara 2 seni provinsi",
            jenis: "Tingkat Provinsi",
            point: 45,
          },
          {
            nama: "Juara 3 seni provinsi",
            jenis: "Tingkat Provinsi",
            point: 35,
          },
          {
            nama: "Juara 1 seni nasional",
            jenis: "Tingkat Nasional",
            point: 90,
          },
          {
            nama: "Juara 2 seni nasional",
            jenis: "Tingkat Nasional",
            point: 70,
          },
          {
            nama: "Juara 3 seni nasional",
            jenis: "Tingkat Nasional",
            point: 50,
          },
        ],
      },
      {
        nama: "Prestasi Kompetisi Skill",
        tipe: "prestasi",
        items: [
          {
            nama: "Juara 1 LKS tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 20,
          },
          {
            nama: "Juara 2 LKS tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 15,
          },
          {
            nama: "Juara 3 LKS tingkat sekolah",
            jenis: "Tingkat Sekolah",
            point: 12,
          },
          {
            nama: "Juara 1 LKS kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 45,
          },
          {
            nama: "Juara 2 LKS kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 35,
          },
          {
            nama: "Juara 3 LKS kabupaten",
            jenis: "Tingkat Kabupaten",
            point: 30,
          },
          {
            nama: "Juara 1 LKS provinsi",
            jenis: "Tingkat Provinsi",
            point: 70,
          },
          {
            nama: "Juara 2 LKS provinsi",
            jenis: "Tingkat Provinsi",
            point: 60,
          },
          {
            nama: "Juara 3 LKS provinsi",
            jenis: "Tingkat Provinsi",
            point: 50,
          },
          {
            nama: "Juara 1 LKS nasional",
            jenis: "Tingkat Nasional",
            point: 120,
          },
          {
            nama: "Juara 2 LKS nasional",
            jenis: "Tingkat Nasional",
            point: 100,
          },
          {
            nama: "Juara 3 LKS nasional",
            jenis: "Tingkat Nasional",
            point: 80,
          },
          {
            nama: "Peserta LKS internasional",
            jenis: "Tingkat Internasional",
            point: 150,
          },
        ],
      },
      {
        nama: "Prestasi Kepemimpinan",
        tipe: "prestasi",
        items: [
          { nama: "Ketua OSIS", jenis: "Organisasi", point: 25 },
          { nama: "Wakil Ketua OSIS", jenis: "Organisasi", point: 20 },
          { nama: "Sekretaris OSIS", jenis: "Organisasi", point: 15 },
          { nama: "Bendahara OSIS", jenis: "Organisasi", point: 15 },
          { nama: "Ketua kelas", jenis: "Organisasi", point: 10 },
          { nama: "Wakil ketua kelas", jenis: "Organisasi", point: 8 },
          {
            nama: "Koordinator kegiatan sekolah",
            jenis: "Organisasi",
            point: 12,
          },
          { nama: "Paskibra", jenis: "Organisasi", point: 15 },
        ],
      },
      {
        nama: "Prestasi Karakter",
        tipe: "prestasi",
        items: [
          { nama: "Siswa teladan tingkat kelas", jenis: "Karakter", point: 20 },
          {
            nama: "Siswa teladan tingkat sekolah",
            jenis: "Karakter",
            point: 40,
          },
          {
            nama: "Siswa teladan tingkat kabupaten",
            jenis: "Karakter",
            point: 60,
          },
          {
            nama: "Siswa berprestasi tingkat sekolah",
            jenis: "Karakter",
            point: 30,
          },
          {
            nama: "Kehadiran sempurna (1 semester)",
            jenis: "Karakter",
            point: 15,
          },
          {
            nama: "Kehadiran sempurna (1 tahun)",
            jenis: "Karakter",
            point: 25,
          },
          { nama: "Perilaku terpuji", jenis: "Karakter", point: 5 },
          { nama: "Membantu kegiatan sekolah", jenis: "Karakter", point: 8 },
        ],
      },
    ];

    // Gabungkan semua kategori
    const semuaKategori = [...kategoriPelanggaran, ...kategoriPrestasi];

    // Seed data
    for (const kategoriData of semuaKategori) {
      const { items, ...kategoriInfo } = kategoriData;

      console.log(`📝 Creating kategori: ${kategoriInfo.nama}`);

      const kategori = await prisma.kategori.create({
        data: kategoriInfo,
      });

      console.log(`📋 Creating ${items.length} items for ${kategoriInfo.nama}`);

      for (const item of items) {
        await prisma.reportItem.create({
          data: {
            ...item,
            tipe: kategoriInfo.tipe,
            kategoriId: kategori.id,
          },
        });
      }
    }

    console.log("✅ Kategori dan report items seeded successfully!");

    // Summary
    const totalKategori = await prisma.kategori.count();
    const totalItems = await prisma.reportItem.count();
    const totalPelanggaran = await prisma.reportItem.count({
      where: { tipe: "pelanggaran" },
    });
    const totalPrestasi = await prisma.reportItem.count({
      where: { tipe: "prestasi" },
    });

    console.log("\n📊 Summary:");
    console.log(`- Total Kategori: ${totalKategori}`);
    console.log(`- Total Items: ${totalItems}`);
    console.log(`- Items Pelanggaran: ${totalPelanggaran}`);
    console.log(`- Items Prestasi: ${totalPrestasi}`);
  } catch (error) {
    console.error("❌ Error seeding kategori dan items:", error);
    throw error;
  }
}

async function main() {
  try {
    await seedKategoriDanItems();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedKategoriDanItems };
