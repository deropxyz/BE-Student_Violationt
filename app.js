const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const superadminRoute = require("./src/routes/superadmin.route");
const authRoute = require("./src/routes/auth.route");
const teacherRoute = require("./src/routes/teacher.route");
const studentRoute = require("./src/routes/student.route");
const bkRoute = require("./src/routes/bk.route");
const classroomRoutes = require("./src/routes/classroom");
const violationRoute = require("./src/routes/violation.route");
const studentViolationRoute = require("./src/routes/studentViolation.route");
const angkatanRoute = require("./src/routes/angkatan.route");
const orangTuaRoute = require("./src/routes/orangTua.route");
const tindakanOtomatisRoute = require("./src/routes/tindakanOtomatis.route");
const kenaikanKelasRoute = require("./src/routes/kenaikanKelas.route");
const importRoute = require("./src/routes/import.route");
const reportsRoute = require("./src/routes/reports.route");
const notificationRoute = require("./src/routes/notification.route");

dotenv.config();

const app = express();

// Middleware agar FE lokal bisa konek ke BE
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://smk14-production.up.railway.app",
      "http://192.168.193.229:5173",
      "https://kesiswaan-smkn14garut.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoute);
app.use("/api/superadmin", superadminRoute);
app.use("/api/users/teachers", teacherRoute);
app.use("/api/users/students", studentRoute);
app.use("/api/users/bk", bkRoute);
app.use("/api/users/orangtua", orangTuaRoute);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/violations", violationRoute);
app.use("/api/student-violations", studentViolationRoute);
app.use("/api/angkatan", angkatanRoute);
app.use("/api/tindakan-otomatis", tindakanOtomatisRoute);
app.use("/api/kenaikan-kelas", kenaikanKelasRoute);
app.use("/api/import", importRoute);
app.use("/api/reports", reportsRoute);
app.use("/api/notifications", notificationRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
