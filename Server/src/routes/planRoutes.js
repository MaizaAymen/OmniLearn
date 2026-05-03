const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { Op } = require("sequelize");
const { User, Institution, InviteLink, Problem, Class, Enrollment, Announcement, CodeSubmission, Notification } = require("../models");
const { emitNotification } = require("../realtime/messageHub");

const WORKSPACE_INDEX = path.join(__dirname, "..", "uploads", "workspace.json");
const FREE_WORKSPACE_LIMIT = 3;

function getWorkspaceUsage(userId) {
  try {
    const all = JSON.parse(fs.readFileSync(WORKSPACE_INDEX, "utf8"));
    const mine = all.filter(function (i) { return i.userId === userId; });
    return {
      pdfs: mine.filter(function (i) { return i.type === "pdf"; }).length,
      code: mine.filter(function (i) { return i.type === "code"; }).length,
    };
  } catch {
    return { pdfs: 0, code: 0 };
  }
}
const {
  authenticate,
  requireSuperAdmin,
  requireInstitutionAdmin,
} = require("../middleware/Authmiddleware");

// ═════════════════════════════════════════════════════════════════════════════
// FICHIER : planRoutes.js
// Tout ce qui touche aux plans (free/pro/institution) ET aux institutions
// (admin, invitations par lien, rejoindre).
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIQUES (pas besoin d'être connecté)
// ─────────────────────────────────────────────────────────────────────────────

// ÉTAPE 1 : voir les détails d'un lien d'invitation avant de l'accepter.
// L'utilisateur peut voir "Vous êtes invité chez X comme Teacher" avant de cliquer.
router.get("/invite/:token", async (req, res) => {
  try {
    const link = await InviteLink.findByPk(req.params.token, {
      include: [{ model: Institution, as: "institution", attributes: ["id", "name"] }],
    });
    if (!link || link.revoked) return res.status(404).json({ error: "Invalid link" });
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ error: "This link has expired" });
    }
    if (link.maxUses > 0 && link.usedCount >= link.maxUses) {
      return res.status(410).json({ error: "This link has been used too many times" });
    }
    res.json({
      institutionName: link.institution?.name,
      role: link.role,
    });
  } catch (err) {
    console.error("invite lookup:", err);
    res.status(500).json({ error: "Failed to fetch invitation" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// À partir d'ici, il faut être authentifié.
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// USER : INFOS DE MON PLAN
// ─────────────────────────────────────────────────────────────────────────────

// ÉTAPE 1 : le frontend appelle cet endpoint au login pour savoir ce qui est
// débloqué (sidebar, bannière d'upgrade, etc.).
router.get("/me/plan", async (req, res) => {
  try {
    const freeTierTotal = await Problem.count({ where: { isFreeTier: true } });
    const isFree = req.user.plan === "free" && req.user.role !== "admin";
    const usage = getWorkspaceUsage(req.user.id);
    res.json({
      plan: req.user.plan,
      role: req.user.role,
      institutionId: req.user.institutionId,
      limits: {
        problemsVisible: req.user.plan === "free" ? freeTierTotal : null,
        canUseAI: req.user.plan !== "free" || req.user.role === "admin",
        canUsePdf: req.user.plan !== "free" || req.user.role === "admin",
        canJoinClassroom: req.user.plan === "institution" || req.user.role === "admin",
      },
      workspace: {
        pdfs: usage.pdfs,
        code: usage.code,
        pdfLimit: isFree ? FREE_WORKSPACE_LIMIT : null,
        codeLimit: isFree ? FREE_WORKSPACE_LIMIT : null,
      },
    });
  } catch (err) {
    console.error("me/plan:", err);
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

// ÉTAPE 2 : upgrade vers Pro (plus tard remplacé par Stripe — ici on simule).
router.post("/upgrade/pro", async (req, res) => {
  try {
    if (req.user.plan === "institution") {
      return res.status(400).json({ error: "You already have an institution plan" });
    }
    await User.update({ plan: "pro" }, { where: { id: req.user.id } });
    res.json({ message: "Upgraded to Pro", plan: "pro" });
  } catch (err) {
    console.error("upgrade pro:", err);
    res.status(500).json({ error: "Failed to upgrade" });
  }
});

// Self-service upgrade to Institution plan.
router.post("/upgrade/institution", async (req, res) => {
  try {
    if (req.user.plan === "institution") {
      return res.status(400).json({ error: "You already have an institution plan" });
    }
    // EDGE CASE : si l'utilisateur appartient déjà à une autre institution
    // (rejointe via lien d'invitation), on bloque l'upgrade.
    if (req.user.institutionId) {
      return res.status(409).json({
        error: "You already belong to another institution. Leave it before creating your own.",
      });
    }
    await User.update({ plan: "institution" }, { where: { id: req.user.id } });
    res.json({ message: "Upgraded to Institution", plan: "institution" });
  } catch (err) {
    console.error("upgrade institution:", err);
    res.status(500).json({ error: "Failed to upgrade" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER : CRÉER SA PROPRE INSTITUTION (étape onboarding après paiement)
// Conditions :
//   - plan = "institution"
//   - pas déjà dans une institution
// ─────────────────────────────────────────────────────────────────────────────

// Suggéré : on dérive un seatLimit du nombre estimé d'utilisateurs.
function suggestSeatLimit(estimatedUsers) {
  const n = Number(estimatedUsers) || 0;
  if (n <= 50) return 50;       // Starter
  if (n <= 200) return 200;     // Growth
  return 0;                     // Enterprise / illimité
}

router.post("/institutions/self-create", async (req, res) => {
  try {
    if (req.user.plan !== "institution") {
      return res.status(402).json({ error: "Institution plan required" });
    }
    if (req.user.institutionId) {
      return res.status(409).json({ error: "You already belong to an institution" });
    }
    const { name, type, logo, description, contactEmail, estimatedUsers } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Institution name is required" });
    }

    // ÉTAPE 1 : créer l'institution avec un seatLimit suggéré.
    const institution = await Institution.create({
      name: name.trim(),
      adminUserId: req.user.id,
      seatLimit: suggestSeatLimit(estimatedUsers),
      type: type || "school",
      logo: logo || null,
      description: description || null,
      contactEmail: contactEmail || req.user.email,
    });

    // ÉTAPE 2 : promouvoir l'utilisateur (sauf super admin qui garde son rôle).
    const newRole = req.user.role === "admin" ? "admin" : "institution_admin";
    await User.update(
      { role: newRole, institutionId: institution.id },
      { where: { id: req.user.id } }
    );

    res.status(201).json({ institution, role: newRole });
  } catch (err) {
    console.error("self-create institution:", err);
    res.status(500).json({ error: "Failed to create institution" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION ADMIN : ÉDITER LE PROFIL DE SON INSTITUTION
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/institutions/:id", requireInstitutionAdmin, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.institutionId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const institution = await Institution.findByPk(req.params.id);
    if (!institution) return res.status(404).json({ error: "Not found" });

    // On limite explicitement aux champs éditables par l'admin.
    const { name, type, logo, description, contactEmail } = req.body;
    await institution.update({
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(logo !== undefined ? { logo } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(contactEmail !== undefined ? { contactEmail } : {}),
    });
    res.json(institution);
  } catch (err) {
    console.error("update institution:", err);
    res.status(500).json({ error: "Failed to update institution" });
  }
});

// Lire le profil + l'usage des places.
router.get("/institutions/:id", requireInstitutionAdmin, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.institutionId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const institution = await Institution.findByPk(req.params.id);
    if (!institution) return res.status(404).json({ error: "Not found" });
    const memberCount = await User.count({ where: { institutionId: institution.id } });
    res.json({ ...institution.toJSON(), memberCount });
  } catch (err) {
    console.error("get institution:", err);
    res.status(500).json({ error: "Failed to fetch institution" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN : VOIR TOUS LES UTILISATEURS PAR PLAN
// ─────────────────────────────────────────────────────────────────────────────

// ÉTAPE 1 : retourne les utilisateurs groupés par plan.
// Filtre optionnel ?plan=free|pro|institution
router.get("/super-admin/users-by-plan", requireSuperAdmin, async (req, res) => {
  try {
    const where = {};
    if (req.query.plan) where.plan = req.query.plan;

    const users = await User.findAll({
      where,
      attributes: [
        "id", "firstname", "lastname", "email", "role", "plan",
        "institutionId", "createdAt", "isActive",
      ],
      order: [["createdAt", "DESC"]],
    });

    // ÉTAPE 2 : on calcule des compteurs simples pour le dashboard.
    const counts = {
      free: users.filter((u) => u.plan === "free").length,
      pro: users.filter((u) => u.plan === "pro").length,
      institution: users.filter((u) => u.plan === "institution").length,
      total: users.length,
    };

    res.json({ counts, users });
  } catch (err) {
    console.error("users-by-plan:", err);
    res.status(500).json({ error: "Failed to fetch users by plan" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN : CRÉER UNE INSTITUTION (et nommer son admin)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/institutions", requireSuperAdmin, async (req, res) => {
  try {
    const { name, adminUserId, seatLimit } = req.body;
    if (!name || !adminUserId) {
      return res.status(400).json({ error: "name and adminUserId are required" });
    }

    // ÉTAPE 1 : vérifier que l'utilisateur existe.
    const admin = await User.findByPk(adminUserId);
    if (!admin) return res.status(404).json({ error: "Admin user not found" });

    // ÉTAPE 2 : créer l'institution.
    const institution = await Institution.create({
      name,
      adminUserId,
      seatLimit: seatLimit || 0,
    });

    // ÉTAPE 3 : promouvoir l'utilisateur en institution_admin et le lier.
    await admin.update({
      role: "institution_admin",
      plan: "institution",
      institutionId: institution.id,
    });

    res.status(201).json(institution);
  } catch (err) {
    console.error("create institution:", err);
    res.status(500).json({ error: "Failed to create institution" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION ADMIN : INVITER PAR LIEN
// ─────────────────────────────────────────────────────────────────────────────

// Helper : on génère un token URL-safe court mais imprévisible.
const makeToken = () => crypto.randomBytes(16).toString("hex");

// ÉTAPE 1 : créer un nouveau lien d'invitation.
router.post("/institutions/:id/invite-links", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, maxUses, expiresInDays } = req.body;

    // SÉCURITÉ : un institution_admin ne peut créer des liens que pour SON institution.
    if (req.user.role !== "admin" && req.user.institutionId !== id) {
      return res.status(403).json({ error: "You can only invite for your own institution" });
    }

    if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "role must be 'teacher' or 'student'" });
    }

    // ÉTAPE 1bis : vérifier le quota de places (seatLimit > 0 = limite).
    const inst = await Institution.findByPk(id);
    if (!inst) return res.status(404).json({ error: "Institution not found" });
    if (inst.seatLimit > 0) {
      const used = await User.count({ where: { institutionId: id } });
      if (used >= inst.seatLimit) {
        return res.status(409).json({
          error: `Seat limit reached (${used}/${inst.seatLimit}). Upgrade to add more members.`,
        });
      }
    }

    // ÉTAPE 2 : calculer la date d'expiration si fournie.
    let expiresAt = null;
    if (expiresInDays && Number(expiresInDays) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
    }

    // ÉTAPE 3 : créer le lien.
    const link = await InviteLink.create({
      token: makeToken(),
      institutionId: id,
      createdBy: req.user.id,
      role,
      maxUses: maxUses || 0,
      expiresAt,
    });

    res.status(201).json(link);
  } catch (err) {
    console.error("create invite link:", err);
    res.status(500).json({ error: "Failed to create invite link" });
  }
});

// Recherche d'utilisateurs invitables (nom ou email).
router.get("/users/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json([]);
  const like = `%${q}%`;
  const users = await User.findAll({
    where: {
      institutionId: null,
      [Op.or]: [
        { firstname: { [Op.iLike]: like } },
        { lastname: { [Op.iLike]: like } },
        { email: { [Op.iLike]: like } },
      ],
    },
    attributes: ["id", "firstname", "lastname", "email", "role"],
    limit: 10,
  });
  res.json(users);
});

// Inviter un utilisateur par email + notification in-app.
router.post("/institutions/:id/invite-user", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    if (req.user.role !== "admin" && req.user.institutionId !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!email || !["teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "email + valid role required" });
    }
    const target = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!target) return res.status(404).json({ error: "No user with this email" });
    if (target.institutionId) return res.status(409).json({ error: "User already in an institution" });

    const inst = await Institution.findByPk(id);
    const link = await InviteLink.create({
      token: makeToken(),
      institutionId: id,
      createdBy: req.user.id,
      role,
      maxUses: 1,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      targetUserId: target.id,
    });
    const notif = await Notification.create({
      userId: target.id,
      type: "institution-invite",
      title: "You have been invited",
      message: `${inst.name} invited you to join as ${role}`,
      link: `/join-institution/${link.token}`,
      data: { token: link.token },
    });
    emitNotification(req.app.get("io"), target.id, notif);
    res.status(201).json({ link, notified: true });
  } catch (err) {
    console.error("invite user:", err);
    res.status(500).json({ error: "Failed to invite user" });
  }
});

// ÉTAPE 2 : lister les liens d'invitation d'une institution.
router.get("/institutions/:id/invite-links", requireInstitutionAdmin, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.institutionId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const links = await InviteLink.findAll({
      where: { institutionId: req.params.id },
      order: [["createdAt", "DESC"]],
    });
    res.json(links);
  } catch (err) {
    console.error("list invite links:", err);
    res.status(500).json({ error: "Failed to list invite links" });
  }
});

// ÉTAPE 3 : révoquer un lien (au cas où il a fuité).
router.delete("/invite-links/:token", requireInstitutionAdmin, async (req, res) => {
  try {
    const link = await InviteLink.findByPk(req.params.token);
    if (!link) return res.status(404).json({ error: "Link not found" });
    if (req.user.role !== "admin" && req.user.institutionId !== link.institutionId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await link.update({ revoked: true });
    res.json({ message: "Link revoked" });
  } catch (err) {
    console.error("revoke invite link:", err);
    res.status(500).json({ error: "Failed to revoke link" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER : ACCEPTER UNE INVITATION (cliquer sur le lien)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/invite/:token/accept", async (req, res) => {
  try {
    // ÉTAPE 1 : trouver le lien et vérifier qu'il est encore valable.
    const link = await InviteLink.findByPk(req.params.token);
    if (!link || link.revoked) return res.status(404).json({ error: "Invalid link" });
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return res.status(410).json({ error: "This link has expired" });
    }
    if (link.maxUses > 0 && link.usedCount >= link.maxUses) {
      return res.status(410).json({ error: "This link has been used too many times" });
    }

    // ÉTAPE 2 : si l'utilisateur est déjà dans une AUTRE institution, on bloque.
    if (req.user.institutionId && req.user.institutionId !== link.institutionId) {
      return res.status(409).json({ error: "You already belong to another institution" });
    }

    // ÉTAPE 3 : on met à jour l'utilisateur :
    //   - rôle = celui prévu dans le lien (teacher / student)
    //   - plan = institution (couvert par l'école)
    //   - institutionId = celui du lien
    await User.update(
      {
        role: link.role,
        plan: "institution",
        institutionId: link.institutionId,
      },
      { where: { id: req.user.id } }
    );

    // ÉTAPE 4 : on incrémente le compteur d'utilisations.
    await link.increment("usedCount");

    res.json({
      message: "Welcome to the institution",
      institutionId: link.institutionId,
      role: link.role,
    });
  } catch (err) {
    console.error("accept invite:", err);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTION ADMIN : VOIR SES MEMBRES
// ─────────────────────────────────────────────────────────────────────────────
router.get("/institutions/:id/members", requireInstitutionAdmin, async (req, res) => {
  try {
    // SÉCURITÉ : un institution_admin ne voit QUE son institution.
    if (req.user.role !== "admin" && req.user.institutionId !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const members = await User.findAll({
      where: { institutionId: req.params.id },
      attributes: [
        "id", "firstname", "lastname", "email", "role", "plan",
        "isActive", "createdAt",
      ],
      order: [["role", "ASC"], ["firstname", "ASC"]],
    });

    res.json(members);
  } catch (err) {
    console.error("list members:", err);
    res.status(500).json({ error: "Failed to list members" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER : récupère les ids des membres (étudiants + profs) d'une institution.
// ─────────────────────────────────────────────────────────────────────────────
async function getInstitutionMemberIds(institutionId) {
  const members = await User.findAll({
    where: { institutionId },
    attributes: ["id", "role"],
  });
  return {
    all: members.map((m) => m.id),
    teachers: members.filter((m) => m.role === "teacher").map((m) => m.id),
    students: members.filter((m) => m.role === "student").map((m) => m.id),
  };
}

// Garde simple : on vérifie que l'admin agit bien sur SON institution.
function checkOwnInstitution(req, id) {
  return req.user.role === "admin" || req.user.institutionId === id;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND CENTER : statistiques globales pour l'overview
// ─────────────────────────────────────────────────────────────────────────────
router.get("/institutions/:id/stats", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });

    const ids = await getInstitutionMemberIds(id);

    // Classrooms = celles dont le teacher appartient à l'institution.
    const classrooms = await Class.findAll({
      where: { teacherId: ids.teachers.length ? ids.teachers : [null] },
      attributes: ["id", "name", "isActive", "createdAt"],
    });
    const enrolled = await Enrollment.count({
      where: { classId: classrooms.map((c) => c.id) },
    });

    // Activité récente : 10 derniers événements (membres + classes + annonces).
    const recentMembers = await User.findAll({
      where: { institutionId: id },
      order: [["createdAt", "DESC"]],
      limit: 5,
      attributes: ["id", "firstname", "lastname", "role", "createdAt"],
    });
    const recentClasses = classrooms
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    const recentAnnouncements = await Announcement.findAll({
      where: { institutionId: id },
      order: [["createdAt", "DESC"]],
      limit: 5,
      attributes: ["id", "title", "content", "createdAt"],
    });

    const activity = [
      ...recentMembers.map((m) => ({
        type: "member_joined",
        at: m.createdAt,
        text: `${m.firstname} ${m.lastname} joined as ${m.role}`,
      })),
      ...recentClasses.map((c) => ({
        type: "classroom_created",
        at: c.createdAt,
        text: `Classroom "${c.name}" was created`,
      })),
      ...recentAnnouncements.map((a) => ({
        type: "announcement",
        at: a.createdAt,
        text: `Announcement: ${a.title || a.content.slice(0, 60)}`,
      })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);

    res.json({
      classroomCount: classrooms.length,
      activeClassroomCount: classrooms.filter((c) => c.isActive).length,
      teacherCount: ids.teachers.length,
      studentCount: ids.students.length,
      enrolledCount: enrolled,
      recentActivity: activity,
    });
  } catch (err) {
    console.error("institution stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLASSROOMS scoped à l'institution + filtres + compteurs
// ─────────────────────────────────────────────────────────────────────────────
router.get("/institutions/:id/classrooms", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });

    const ids = await getInstitutionMemberIds(id);
    const where = { teacherId: ids.teachers.length ? ids.teachers : [null] };

    // Filtres optionnels.
    if (req.query.teacherId) where.teacherId = req.query.teacherId;
    if (req.query.gradeId) where.gradeId = req.query.gradeId;
    if (req.query.specialityId) where.specialityId = req.query.specialityId;
    if (req.query.levelId) where.levelId = req.query.levelId;
    if (req.query.academicYear) where.academicYear = req.query.academicYear;

    const classrooms = await Class.findAll({
      where,
      include: [{ model: User, as: "teacher", attributes: ["id", "firstname", "lastname", "email"] }],
      order: [["createdAt", "DESC"]],
    });

    // Compteurs + dernier signe d'activité (dernière annonce ou inscription).
    const enriched = await Promise.all(classrooms.map(async (c) => {
      const enrollmentCount = await Enrollment.count({ where: { classId: c.id } });
      const lastAnnouncement = await Announcement.findOne({
        where: { classId: c.id },
        order: [["createdAt", "DESC"]],
        attributes: ["createdAt"],
      });
      const lastActivity = lastAnnouncement?.createdAt || c.createdAt;
      const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      return { ...c.toJSON(), enrollmentCount, lastActivity, daysSince, isInactive: daysSince > 30 };
    }));

    res.json(enriched);
  } catch (err) {
    console.error("institution classrooms:", err);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
});

// Audit read-only : voir le prof + les étudiants d'une classe.
router.get("/institutions/:id/classrooms/:classId/audit", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id, classId } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });

    const cls = await Class.findByPk(classId, {
      include: [{ model: User, as: "teacher", attributes: ["id", "firstname", "lastname", "email"] }],
    });
    if (!cls) return res.status(404).json({ error: "Classroom not found" });

    const enrollments = await Enrollment.findAll({
      where: { classId },
      include: [{ model: User, as: "student", attributes: ["id", "firstname", "lastname", "email"] }],
    });
    res.json({
      classroom: cls,
      students: enrollments.map((e) => ({ ...e.student.toJSON(), enrolledAt: e.enrolledAt, status: e.status })),
    });
  } catch (err) {
    console.error("classroom audit:", err);
    res.status(500).json({ error: "Failed to fetch audit" });
  }
});

// Archive / réactive une classe.
router.patch("/institutions/:id/classrooms/:classId", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id, classId } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });

    const cls = await Class.findByPk(classId);
    if (!cls) return res.status(404).json({ error: "Classroom not found" });

    const { isActive } = req.body;
    if (typeof isActive === "boolean") await cls.update({ isActive });
    res.json(cls);
  } catch (err) {
    console.error("update classroom:", err);
    res.status(500).json({ error: "Failed to update classroom" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS : retirer un membre de l'institution
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/institutions/:id/members/:userId", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });
    if (userId === req.user.id) return res.status(400).json({ error: "You cannot remove yourself" });

    const user = await User.findByPk(userId);
    if (!user || user.institutionId !== id) {
      return res.status(404).json({ error: "Member not found in your institution" });
    }
    // On retire le lien sans supprimer l'utilisateur. Plan repasse à "free".
    await user.update({ institutionId: null, plan: "free" });
    res.json({ message: "Member removed" });
  } catch (err) {
    console.error("remove member:", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANNONCES INSTITUTION-WIDE
// ─────────────────────────────────────────────────────────────────────────────
router.get("/institutions/:id/announcements", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });

    const list = await Announcement.findAll({
      where: { institutionId: id },
      order: [["pinned", "DESC"], ["createdAt", "DESC"]],
    });
    res.json(list);
  } catch (err) {
    console.error("list announcements:", err);
    res.status(500).json({ error: "Failed to list announcements" });
  }
});

router.post("/institutions/:id/announcements", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });

    const { title, content, targetRole, classId, pinned } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: "Content is required" });

    const ann = await Announcement.create({
      institutionId: id,
      classId: classId || null,
      authorId: req.user.id,
      title: title || null,
      content,
      targetRole: ["all", "students", "teachers"].includes(targetRole) ? targetRole : "all",
      pinned: !!pinned,
    });
    res.status(201).json(ann);
  } catch (err) {
    console.error("create announcement:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.delete("/institutions/:id/announcements/:annId", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id, annId } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });
    const ann = await Announcement.findByPk(annId);
    if (!ann || ann.institutionId !== id) return res.status(404).json({ error: "Not found" });
    await ann.destroy();
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("delete announcement:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS : chiffres simples agrégés sur l'institution
// ─────────────────────────────────────────────────────────────────────────────
router.get("/institutions/:id/analytics", requireInstitutionAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!checkOwnInstitution(req, id)) return res.status(403).json({ error: "Forbidden" });

    const ids = await getInstitutionMemberIds(id);

    // Étudiants : taux moyen de "isCorrect" sur leurs soumissions.
    const submissions = await CodeSubmission.findAll({
      where: { userId: ids.students.length ? ids.students : [null] },
      attributes: ["userId", "isCorrect", "createdAt"],
    });
    const totalSub = submissions.length;
    const correctSub = submissions.filter((s) => s.isCorrect).length;
    const completionRate = totalSub ? Math.round((correctSub / totalSub) * 100) : 0;

    // Profs : dernière soumission/annonce écrite, nombre de classrooms.
    const teachers = await User.findAll({
      where: { id: ids.teachers.length ? ids.teachers : [null] },
      attributes: ["id", "firstname", "lastname", "email"],
    });
    const teacherActivity = await Promise.all(teachers.map(async (t) => {
      const classCount = await Class.count({ where: { teacherId: t.id } });
      const lastAnn = await Announcement.findOne({
        where: { authorId: t.id },
        order: [["createdAt", "DESC"]],
        attributes: ["createdAt"],
      });
      return {
        id: t.id,
        name: `${t.firstname} ${t.lastname}`,
        email: t.email,
        classCount,
        lastActiveAt: lastAnn?.createdAt || null,
      };
    }));

    // Heatmap simple par classroom : compte de soumissions par classe.
    const classrooms = await Class.findAll({
      where: { teacherId: ids.teachers.length ? ids.teachers : [null] },
      attributes: ["id", "name"],
    });
    const heatmap = await Promise.all(classrooms.map(async (c) => {
      const enrolledIds = (await Enrollment.findAll({
        where: { classId: c.id },
        attributes: ["studentId"],
      })).map((e) => e.studentId);
      const subCount = enrolledIds.length
        ? await CodeSubmission.count({ where: { userId: enrolledIds } })
        : 0;
      return { id: c.id, name: c.name, submissions: subCount, students: enrolledIds.length };
    }));

    res.json({
      submissions: { total: totalSub, correct: correctSub, completionRate },
      teacherActivity,
      heatmap,
    });
  } catch (err) {
    console.error("analytics:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;
