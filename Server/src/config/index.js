module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "smartlearn-secret-key-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/smartlearn",
  PORT: process.env.PORT || 5000,
};
