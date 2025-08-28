// seed-guru.js
// Jalankan: node seed-guru.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
require("dotenv").config();

const prisma = new PrismaClient();

const guruList = [
  { nama: "Irwan Kustia Dermawan, S.Kom", nip: "197905162022211003" },
  { nama: "Evi Novianti Sastra, K.S.Pd", nip: "198710052022212006" },
  { nama: "Ade Herdiana, S.Pd, S.T", nip: "198807012022211005" },
  { nama: "Rosa Rahmatika, M.Pd", nip: "198905242022212008" },
  { nama: "Diki Ramdani, S.Kom", nip: "199203042022211002" },
  { nama: "Hilma Nur Afidati, S.Pd", nip: "199208282022212017" },
  { nama: "Egi Pratama, S.Pd", nip: "199207262022211008" },
  { nama: "Eka Agung Hidayah, S.Pd", nip: "199306022022211006" },
  { nama: "MASFUFAH, S.Ag, M.Pd", nip: "197310262022212004" },
  { nama: "NURYADI, S.PdI", nip: "197906262022211010" },
  { nama: "PURNAMA ALAM, S.Pd", nip: "198208082022211013" },
  { nama: "RUDI SIROJUDIN ABAS, S.Sn", nip: "198307102022211021" },
  { nama: "SHOLIHAT NURUL INSANI, S.Pd.I", nip: "198508082022212051" },
  { nama: "ELKA LAPRIYANTISARI, S.E., M.Si.", nip: "198604102022212049" },
  { nama: "MUHAMAD ABDUL AZIZ, S.Pd", nip: "198912192022211014" },
  { nama: "ABDUL PATAH, S.T", nip: "199409092022211006" },
  { nama: "ELDINI SAPARINA, S.Pd", nip: "199706172022212010" },
  { nama: "Maulana Yusup, M.Pd", nip: "199209212023211005" },
  { nama: "Yadi Suryadi, SHI", nip: "198007122023211005" },
  { nama: "Wina Amalia, S.Pd", nip: "198403272024212012" },
  { nama: "SANDI RUSTANDI, S. Pd", nip: "199009302024211011" },
  { nama: "Atri Solihah, S.Pd", nip: "198712132024212016" },
  { nama: "Yeni Ratna Suminar, S.Pd", nip: "197103242024212002" },
  { nama: "Moh Yogi Nurmagni, S.T", nip: "199112252025211007" },
  // NUPTK only (tanpa NIP)
  { nama: "Fenti Nuraida, S.Pd", nuptk: "4752 7696 7023 0202" },
  { nama: "Idang Hendrawan, S.Pd", nuptk: "7054 7656 6611 0033" },
  {
    nama: "Siti Robiatul Adawiyah, S.Pd.I, M.Pd",
    nuptk: "0752 7686 6813 0162",
  },
  { nama: "Joko Suprianto, S.Pd.M.Pd", nuptk: "3342 7686 7013 0373" },
  { nama: "Cucu Nurhayati, S.Pd", nuptk: "6540 7706 7123 0152" },
  { nama: "Elis Rahmawati, S.Pd", nuptk: "1838 7716 7223 0132" },
  { nama: "Eneng Rosmawati, S.S", nuptk: "1053 7666 6723 0273" },
  { nama: "Rina Nuraeni, S.Pd", nuptk: "" },
  { nama: "Siti Rohmah, S.Pd", nuptk: "2435 7716 7213 0053" },
  { nama: "Caca Trisutiawan, S.Pdi", nuptk: "7634 7646 6513 0262" },
  { nama: "Muhamad Ginan Nuriadi, S. Kom", nuptk: "" },
  { nama: "Liani Azhar, S.Pd", nuptk: "2056 7716 7223 0233" },
  { nama: "DEDE SURYADI, SE", nuptk: "0536 7736 7413 0133" },
  { nama: "Yulianti Nurjanah, S.Pd", nuptk: "4152 7746 7523 0183" },
  { nama: "Imas Devina Fatonah, S.Pd", nuptk: "" },
  { nama: "Adam hizbulloh, S.T", nuptk: "" },
  { nama: "Dynny Nuraeni, S.Pd", nuptk: "" },
  { nama: "Yudi Heryadi, ST", nuptk: "6543 7586 5913 0102" },
  { nama: "Rahmat Taopik, S.T", nuptk: "" },
  { nama: "Salma Suryana, S.Pd", nuptk: "" },
  { nama: "AI SUGIARTI, S.S, S.Pd", nuptk: "6336 7556 5730 0023" },
  { nama: "Nur Muhammad Zaenul, S.T", nuptk: "2141 7746 7513 0033" },
];

const namalist = [
  { nama: "Irwan Kustia Dermawan" },
  { nama: "Evi Novianti Sastra" },
  { nama: "Ade Herdiana" },
  { nama: "Rosa Rahmatika" },
  { nama: "Diki Ramdani" },
  { nama: "Hilma Nur Afidati" },
  { nama: "Egi Pratama" },
  { nama: "Eka Agung Hidayah" },
  { nama: "MASFUFAH" },
  { nama: "NURYADI" },
  { nama: "PURNAMA ALAM" },
  { nama: "RUDI SIROJUDIN ABAS" },
  { nama: "SHOLIHAT NURUL INSANI" },
  { nama: "ELKA LAPRIYANTISARI" },
  { nama: "MUHAMAD ABDUL AZIZ" },
  { nama: "ABDUL PATAH" },
  { nama: "ELDINI SAPARINA" },
  { nama: "Maulana Yusup" },
  { nama: "Yadi Suryadi" },
  { nama: "Wina Amalia" },
  { nama: "SANDI RUSTANDI" },
  { nama: "Atri Solihah" },
  { nama: "Yeni Ratna Suminar" },
  { nama: "Moh Yogi Nurmagni" },
  // NUPTK only (tanpa NIP)
  { nama: "Fenti Nuraida" },
  { nama: "Idang Hendrawan" },
  {
    nama: "Siti Robiatul Adawiyah",
  },
  { nama: "Joko Suprianto" },
  { nama: "Cucu Nurhayati" },
  { nama: "Elis Rahmawati" },
  { nama: "Eneng Rosmawati" },
  { nama: "Rina Nuraeni" },
  { nama: "Siti Rohmah" },
  { nama: "Caca Trisutiawan" },
  { nama: "Muhamad Ginan Nuriadi" },
  { nama: "Liani Azhar" },
  { nama: "DEDE SURYADI" },
  { nama: "Yulianti Nurjanah" },
  { nama: "Imas Devina Fatonah" },
  { nama: "Adam hizbulloh" },
  { nama: "Dynny Nuraeni" },
  { nama: "Yudi Heryadi" },
  { nama: "Rahmat Taopik" },
  { nama: "Salma Suryana" },
  { nama: "AI SUGIARTI" },
  { nama: "Nur Muhammad Zaenul" },
];

function getEmail(nama) {
  // Cari di namalist
  const clean = nama.split(",")[0].trim();
  const found = namalist.find(
    (n) => n.nama.toLowerCase() === clean.toLowerCase()
  );
  let base = found ? found.nama : clean;
  let parts = base.split(/\s+/).map((p) => p.replace(/\./g, "").toLowerCase());
  if (parts.length === 1) {
    return `${parts[0]}@smkn14.sch.id`;
  } else if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[1]}@smkn14.sch.id`;
  }
}

async function main() {
  const defaultPassword = process.env.DEFAULT_PASSWORD || "smkn14garut";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  for (const guru of guruList) {
    const email = getEmail(guru.nama);
    try {
      // Cek user
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: guru.nama,
            email,
            password: hashedPassword,
            role: "guru",
          },
        });
        console.log(`User dibuat: ${guru.nama} (${email})`);
      } else {
        // Update role jika bukan guru
        if (user.role !== "guru") {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: "guru" },
          });
          console.log(`User diupdate ke guru: ${guru.nama} (${email})`);
        } else {
          console.log(`User sudah ada: ${guru.nama} (${email})`);
        }
      }
      // Gabungkan nip dan nuptk ke kolom nip jika keduanya ada
      let nipValue =
        guru.nip && guru.nuptk
          ? `${guru.nip} ${guru.nuptk}`
          : guru.nip || guru.nuptk || null;
      // Cek teacher
      let teacher = await prisma.teacher.findUnique({
        where: { userId: user.id },
      });
      if (!teacher) {
        await prisma.teacher.create({
          data: {
            userId: user.id,
            nip: nipValue,
          },
        });
        console.log(`Teacher dibuat: ${guru.nama}`);
      } else {
        // Update nip jika perlu
        await prisma.teacher.update({
          where: { userId: user.id },
          data: {
            nip: nipValue || teacher.nip,
          },
        });
        console.log(`Teacher sudah ada: ${guru.nama}`);
      }
    } catch (err) {
      console.error(`Gagal tambah/update ${guru.nama}:`, err.message);
    }
  }
  await prisma.$disconnect();
}

main();
