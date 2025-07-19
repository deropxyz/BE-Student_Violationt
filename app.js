const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const superadminRoute = require("./src/routes/superadmin.route");
const authRoute = require("./src/routes/auth.route");
const userRoute = require("./src/routes/user.route");

dotenv.config();

const app = express();

// Middleware agar FE lokal bisa konek ke BE
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://smk14-production.up.railway.app",
      "http://192.168.193.229:5173",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoute);
app.use("/api/superadmin", superadminRoute);
app.use("/api/users", userRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
