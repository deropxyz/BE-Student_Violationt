const express = require("express");
const dotenv = require("dotenv");
const authRoute = require("./src/routes/auth.route");

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
