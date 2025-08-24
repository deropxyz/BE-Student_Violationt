const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedAutomasiConfig() {
  console.log("🌱 Seeding automasi config...");

  try {
    // Hapus data lama jika ada
    await prisma.automasiConfig.deleteMany({});

    // Seed konfigurasi automasi surat peringatan
    const configs = [
      {
        nama: "Surat Peringatan 1",
        threshold: -100,
        jenisSurat: "SP1",
        tingkat: 1,
        judulTemplate: "Surat Peringatan 1 - {NAMA_SISWA}",
        isiTemplate: `
Kepada Yth.
{NAMA_ORTU}
Orang Tua/Wali dari {NAMA_SISWA}

Dengan hormat,

Berdasarkan catatan pelanggaran yang tercatat di sistem monitoring siswa SMK Negeri 14, dengan ini kami sampaikan bahwa putra/putri Bapak/Ibu:

Nama: {NAMA_SISWA}
NISN: {NISN}
Kelas: {KELAS}

Telah mencapai total poin pelanggaran sebesar {TOTAL_SCORE} poin, yang mana telah melewati batas toleransi untuk Surat Peringatan 1 (-100 poin).

Dengan ini kami memberikan SURAT PERINGATAN 1 kepada siswa yang bersangkutan untuk segera memperbaiki sikap dan perilakunya di sekolah.

Kami mohon dukungan dan bimbingan dari orang tua untuk membantu putra/putri agar dapat mematuhi tata tertib sekolah dengan baik.

Demikian surat peringatan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.

Surakarta, {TANGGAL}

Kepala Sekolah SMK Negeri 14 Surakarta
        `,
        isActive: true,
      },
      {
        nama: "Surat Pemanggilan Orang Tua",
        threshold: -200,
        jenisSurat: "PANGGIL_ORTU",
        tingkat: 2,
        judulTemplate: "Surat Pemanggilan Orang Tua - {NAMA_SISWA}",
        isiTemplate: `
Kepada Yth.
{NAMA_ORTU}
Orang Tua/Wali dari {NAMA_SISWA}

Dengan hormat,

Berdasarkan catatan pelanggaran yang tercatat di sistem monitoring siswa SMK Negeri 14, dengan ini kami sampaikan bahwa putra/putri Bapak/Ibu:

Nama: {NAMA_SISWA}
NISN: {NISN}
Kelas: {KELAS}

Telah mencapai total poin pelanggaran sebesar {TOTAL_SCORE} poin, yang sangat mengkhawatirkan dan memerlukan penanganan serius.

Sehubungan dengan hal tersebut, kami mengundang Bapak/Ibu untuk hadir ke sekolah guna membahas kondisi putra/putri Bapak/Ibu dan mencari solusi terbaik untuk perbaikan perilakunya.

Waktu pemanggilan:
Hari/Tanggal: Segera setelah menerima surat ini
Tempat: Ruang BK SMK Negeri 14 Surakarta
Pukul: 08.00 - 15.00 WIB

Kehadiran Bapak/Ibu sangat diharapkan demi kemajuan putra/putri di sekolah.

Demikian surat pemanggilan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.

Surakarta, {TANGGAL}

Guru BK SMK Negeri 14 Surakarta
        `,
        isActive: true,
      },
      {
        nama: "Surat Peringatan Terancam Dikeluarkan",
        threshold: -300,
        jenisSurat: "TERANCAM_KELUAR",
        tingkat: 3,
        judulTemplate: "Surat Peringatan Terancam Dikeluarkan - {NAMA_SISWA}",
        isiTemplate: `
Kepada Yth.
{NAMA_ORTU}
Orang Tua/Wali dari {NAMA_SISWA}

Dengan hormat,

Berdasarkan catatan pelanggaran yang tercatat di sistem monitoring siswa SMK Negeri 14, dengan ini kami sampaikan bahwa putra/putri Bapak/Ibu:

Nama: {NAMA_SISWA}
NISN: {NISN}
Kelas: {KELAS}

Telah mencapai total poin pelanggaran sebesar {TOTAL_SCORE} poin, yang telah melampaui batas maksimum toleransi sekolah.

DENGAN INI KAMI MEMBERIKAN PERINGATAN TERAKHIR bahwa siswa yang bersangkutan TERANCAM DIKELUARKAN dari SMK Negeri 14 Surakarta apabila masih melakukan pelanggaran atau tidak menunjukkan perbaikan perilaku yang signifikan.

Kami memberikan kesempatan terakhir selama 2 (dua) minggu untuk menunjukkan perbaikan nyata. Selama periode ini, siswa akan berada dalam pengawasan ketat dari pihak sekolah.

Kami sangat mengharapkan dukungan penuh dari orang tua untuk membimbing putra/putri agar dapat memperbaiki diri dan tetap dapat melanjutkan pendidikan di sekolah kami.

Demikian surat peringatan ini kami sampaikan dengan penuh harapan akan adanya perbaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.

Surakarta, {TANGGAL}

Kepala Sekolah SMK Negeri 14 Surakarta
        `,
        isActive: true,
      },
    ];

    for (const config of configs) {
      await prisma.automasiConfig.create({
        data: config,
      });
    }

    console.log("✅ Automasi config seeded successfully!");

    // Tampilkan hasil
    const result = await prisma.automasiConfig.findMany({
      orderBy: { threshold: "asc" },
    });

    console.log(`📊 Total configs created: ${result.length}`);
    result.forEach((config) => {
      console.log(`   - ${config.nama} (Threshold: ${config.threshold})`);
    });
  } catch (error) {
    console.error("❌ Error seeding automasi config:", error);
  }
}

async function main() {
  await seedAutomasiConfig();
  await prisma.$disconnect();
}

if (require.main === module) {
  main();
}

module.exports = { seedAutomasiConfig };
