const jwt = require("jsonwebtoken");
const config = require("../config");
const { User } = require("../models");

/**
 * Middleware to verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "email", "firstname", "lastname", "role", "isActive"],
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
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  next();
};

/**
 * Middleware to check if user is admin or teacher
 */
const requireAdminOrTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    return res.status(403).json({ error: "Admin or teacher access required." });
  }

  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAdminOrTeacher,
};
