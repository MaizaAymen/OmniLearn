require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const { PORT } = require("./config");
const sequelize = require("./config/database");
const { ensureDatabase } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const UserRoutes = require("./routes/UserRoutes");
const adminRoutes = require("./routes/adminRoutes");
const UmlRoutes = require("./ai/UmlRoute");
const AiRoutes = require("./ai/Ai");
const pdfRoutes = require("./routes/pdfRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const { setupSessionHub } = require("./realtime/sessionHub");
// Import models/index.js to register all models and associations
const models = require("./models");


const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/", UserRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", AiRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/uml", UmlRoutes);
app.use("/api/submissions", submissionRoutes);


app.get("/", (req, res) => {
  res.json({ message: "SmartLearn Lab AI API is running" });
});


(async () => {
  try {
    if (ensureDatabase) await ensureDatabase();
    await sequelize.authenticate();
    console.log("Connected to PostgreSQL");
    // Ensure base lookup tables exist before applying FK alterations.
    await models.Grade.sync();
    await models.Speciality.sync();
    await models.Level.sync();
    await sequelize.sync({ alter: true });
    await sequelize.query('ALTER TABLE learn.lessons ALTER COLUMN "moduleId" DROP NOT NULL;').catch(() => {});
    setupSessionHub(server);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("PostgreSQL connection error:", err.message);
    process.exit(1);
  }
})();

module.exports = app;
