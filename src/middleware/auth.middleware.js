const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Token tidak ditemukan atau format salah" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // berisi { id, role }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token tidak valid" });
  }
};

// Optional: middleware pembatasan role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Role tidak diizinkan." });
    }
    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
};
