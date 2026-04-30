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
const assignmentRoutes = require("./routes/assignmentRoutes");
const examRoutes = require("./routes/examRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const planRoutes = require("./routes/planRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const { setupSessionHub } = require("./realtime/sessionHub");
const { setupMessageHub } = require("./realtime/messageHub");
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
app.use("/api/assignments", assignmentRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
// ─── Plans, institutions, invitations par lien ────────────────────────────────
app.use("/api/plan", planRoutes);
app.use("/api/workspace", workspaceRoutes);
app.use("/api/stripe", stripeRoutes);


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

    // ─── PRE-SYNC : tables liées au système de plans ─────────────────────
    // Étape 1 : on crée d'abord institutions + invite_links AVANT le alter:true,
    // pour que la colonne users.institutionId n'essaie pas de référencer une
    // table qui n'existe pas encore.
    await models.Institution.sync();
    await models.InviteLink.sync();

    // ─── ENUM PATCH : ajouter "institution_admin" au type users.role ─────
    // PostgreSQL ne permet pas à Sequelize d'ALTER un ENUM utilisé par une
    // colonne. On le fait manuellement avec ALTER TYPE ... ADD VALUE.
    // IF NOT EXISTS évite l'erreur si la valeur est déjà là.
    await sequelize.query(
      `ALTER TYPE "learn"."enum_users_role" ADD VALUE IF NOT EXISTS 'institution_admin';`
    ).catch((e) => console.warn("[enum patch users.role]:", e.message));

    await sequelize.sync({ alter: true });
    await sequelize.query('ALTER TABLE learn.lessons ALTER COLUMN "moduleId" DROP NOT NULL;').catch(() => {});

    // ─── SEED FREE-TIER PROBLEMS ──────────────────────────────────────────
    // Au tout premier démarrage (ou tant qu'aucun problème n'est marqué free),
    // on coche "isFreeTier=true" sur les 10 premiers problèmes existants.
    // Comme ça les utilisateurs free voient quelque chose dès le départ.
    // L'admin pourra changer cette sélection ensuite via le dashboard.
    try {
      const freeCount = await models.Problem.count({ where: { isFreeTier: true } });
      if (freeCount === 0) {
        const firstTen = await models.Problem.findAll({
          order: [["createdAt", "ASC"]],
          limit: 10,
          attributes: ["id"],
        });
        if (firstTen.length > 0) {
          await models.Problem.update(
            { isFreeTier: true },
            { where: { id: firstTen.map((p) => p.id) } }
          );
          console.log(`[free-tier] Marked ${firstTen.length} problems as free-tier`);
        }
      }
    } catch (e) {
      console.warn("[free-tier seed] skipped:", e.message);
    }

    // ─── SEED PRO-TIER PROBLEMS ───────────────────────────────────────────
    // Au tout premier démarrage : si aucun problème n'a isProTier=true, on
    // coche TOUS les problèmes existants. Comme ça les utilisateurs Pro voient
    // déjà le catalogue complet. L'admin pourra décocher ceux qu'il veut
    // réserver à l'institution.
    try {
      const proCount = await models.Problem.count({ where: { isProTier: true } });
      if (proCount === 0) {
        const [, affected] = await models.Problem.update(
          { isProTier: true },
          { where: {} }
        );
        if (affected) console.log(`[pro-tier] Marked all problems as pro-tier`);
      }
    } catch (e) {
      console.warn("[pro-tier seed] skipped:", e.message);
    }

    const io = setupSessionHub(server);
    setupMessageHub(io);
    app.set("io", io);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("PostgreSQL connection error:", err.message);
    process.exit(1);
  }
})();

module.exports = app;
