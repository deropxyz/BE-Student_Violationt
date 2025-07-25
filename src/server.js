require("dotenv").config();
const app = require("../app");
const cors = require("cors");

const PORT = process.env.PORT || 3000;

// Konfigurasi CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://smk14-production.up.railway.app",
      "https://kesiswaan-smkn14garut.vercel.app",
    ],
    credentials: true,
  })
);

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
