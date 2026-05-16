require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: "samiros",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || "changeme_refresh_secret",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "dngl3p2vl",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "672928921445773",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "zM_yDgc9kxci-smkbJbrxyU5dNI",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
};
