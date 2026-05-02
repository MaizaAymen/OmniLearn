const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { Op } = require("sequelize");
const { User, Institution, InviteLink, Problem } = require("../models");

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
    await User.update({ plan: "institution" }, { where: { id: req.user.id } });
    res.json({ message: "Upgraded to Institution", plan: "institution" });
  } catch (err) {
    console.error("upgrade institution:", err);
    res.status(500).json({ error: "Failed to upgrade" });
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

module.exports = router;
