require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { PORT } = require("./config");
const sequelize = require("./config/database");
const { ensureDatabase } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
// Import models/index.js to register all models and associations
require("./models");


const app = express();

// Middleware
app.use(cors(
  "*"
));
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);


app.get("/", (req, res) => {
  res.json({ message: "SmartLearn Lab AI API is running" });
});


(async () => {
  try {
    if (ensureDatabase) await ensureDatabase();
    await sequelize.authenticate();
    console.log("Connected to PostgreSQL");
    await sequelize.sync({ alter: true });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("PostgreSQL connection error:", err.message);
    process.exit(1);
  }
})();

module.exports = app;
