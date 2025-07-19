require("dotenv").config();
const app = require("../app");
const cors = require("cors");

const PORT = process.env.PORT || 3000;

// Konfigurasi CORS agar frontend lokal bisa mengakses
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://smk14-production.up.railway.app",
    ], // tambahkan URL frontend lain jika ada
    credentials: true,
  })
);

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
