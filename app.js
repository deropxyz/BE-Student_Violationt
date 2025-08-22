const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const studentManagementRoute = require("./src/routes/superadmin/studentManagement.route");
const teacherManagementRoute = require("./src/routes/superadmin/teacherManagement.route");
const masterDataRoute = require("./src/routes/superadmin/masterData.route");
const superadminRoute = require("./src/routes/superadmin.route");
const authRoute = require("./src/routes/auth.route");
const violationRoute = require("./src/routes/master/violation.route");
const achievementRoute = require("./src/routes/master/achievement.route");
const reportRoute = require("./src/routes/master/report.route");
const tindakanOtomatisRoute = require("./src/routes/tindakanOtomatis.route");
const kenaikanKelasRoute = require("./src/routes/kenaikanKelas.route");
const importRoute = require("./src/routes/import.route");
const notificationRoute = require("./src/routes/notification.route");
const uploadRoute = require("./src/routes/upload.route");
const bkRoute = require("./src/routes/bk.route");
const guruRoute = require("./src/routes/guru.route");
const academicYearRoute = require("./src/routes/academicYear.route");
const studentRoute = require("./src/routes/student.route");
const kategoriRoute = require("./src/routes/master/kategori.route");
const walikelasRoute = require("./src/routes/walikelas.route");

dotenv.config();

const app = express();

// Middleware agar FE lokal bisa konek ke BE
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://smk14-production.up.railway.app",
      "http://192.168.193.229:5173",
      "https://kesiswaan-smkn14garut.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// Serve static files for uploads
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoute);
app.use("/api/superadmin/students", studentManagementRoute);
app.use("/api/superadmin/teachers", teacherManagementRoute);
app.use("/api/superadmin/masterdata", masterDataRoute);
app.use("/api/superadmin", superadminRoute);
app.use("/api/master/violations", violationRoute);
app.use("/api/master/achievements", achievementRoute);
app.use("/api/master/reports", reportRoute);
app.use("/api/tindakan-otomatis", tindakanOtomatisRoute);
app.use("/api/kenaikan-kelas", kenaikanKelasRoute);
app.use("/api/import", importRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/bk", bkRoute);
app.use("/api/guru", guruRoute);
app.use("/api/academic-years", academicYearRoute);
app.use("/api/student", studentRoute);
app.use("/api/master/kategori", kategoriRoute);
app.use("/api/walikelas", walikelasRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
