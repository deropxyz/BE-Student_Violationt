const bcrypt = require("bcryptjs");

/**
 * Hash password menggunakan bcrypt
 * @param {string} password - Password yang akan di-hash
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password dengan hash
 * @param {string} password - Password plain text
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - True jika match
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate default password berdasarkan environment
 * @returns {string} - Default password
 */
const getDefaultPassword = () => {
  return process.env.DEFAULT_PASSWORD || "smkn14garut";
};

module.exports = {
  hashPassword,
  comparePassword,
  getDefaultPassword,
};
