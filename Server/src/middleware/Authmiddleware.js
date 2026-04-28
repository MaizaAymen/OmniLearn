const jwt = require("jsonwebtoken");
const config = require("../config");
const { User } = require("../models");

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHENTIFICATION
 * Vérifie le token JWT et charge l'utilisateur dans req.user.
 * On charge AUSSI plan + institutionId pour les checks de plan plus loin.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.JWT_SECRET);

    // ÉTAPE 1 : on récupère l'utilisateur AVEC son plan et son institution.
    const user = await User.findByPk(decoded.id, {
      attributes: [
        "id", "email", "firstname", "lastname", "role",
        "isActive", "plan", "institutionId",
      ],
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated." });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token." });
    }
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed." });
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTH OPTIONNELLE
 * Si un token est présent on remplit req.user, sinon on continue sans bloquer.
 * Utile pour /getallproblems (la liste s'affiche aux invités mais filtrée).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], config.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: [
        "id", "email", "firstname", "lastname", "role",
        "isActive", "plan", "institutionId",
      ],
    });
    if (user && user.isActive) req.user = user;
  } catch {
    // Token invalide ou expiré : on ignore et on continue en invité.
  }
  next();
};

// Super admin de la plateforme : role === "admin"
const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  next();
};

// Admin OU teacher (utilisé pour les écrans "staff")
const requireAdminOrTeacher = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Admin or teacher access required." });
  }
  next();
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GATES PAR PLAN
 * On vérifie ici req.user.plan, pas req.user.role. Plan = ce que l'utilisateur
 * a payé. Role = ce qu'il fait dans le système.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ÉTAPE 1 : bloque les utilisateurs free.
// "pro" et "institution" passent. L'admin de plateforme passe aussi (pour QA).
const requirePro = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  if (req.user.role === "admin") return next();
  if (req.user.plan === "pro" || req.user.plan === "institution") return next();
  return res.status(402).json({
    error: "Upgrade required",
    feature: "This feature is available on the Pro plan.",
    upgradeTo: "pro",
  });
};

// ÉTAPE 2 : seul un compte "institution" peut accéder aux classrooms.
const requireInstitution = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  if (req.user.role === "admin") return next();
  if (req.user.plan === "institution") return next();
  return res.status(402).json({
    error: "Upgrade required",
    feature: "Classrooms are part of the Institution plan.",
    upgradeTo: "institution",
  });
};

// ÉTAPE 3 : super admin de la plateforme (alias clair de requireAdmin).
const requireSuperAdmin = requireAdmin;

// ÉTAPE 4 : admin de SA propre institution. Le super admin passe toujours.
const requireInstitutionAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required." });
  if (req.user.role === "admin") return next();
  if (req.user.role === "institution_admin" && req.user.institutionId) return next();
  return res.status(403).json({ error: "Institution admin access required." });
};

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireAdminOrTeacher,
  requirePro,
  requireInstitution,
  requireSuperAdmin,
  requireInstitutionAdmin,
};
