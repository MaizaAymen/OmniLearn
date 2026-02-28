const express = require("express");
const { body } = require("express-validator");
const { register, login, getMe, googleLogin } = require("../controllers/authController");
const { auth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post(
  "/register",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .optional()
      .isIn(["admin", "teacher", "student"])
      .withMessage("Invalid role"),
  ],
  register
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// GET /api/auth/me (protected)
router.get("/me", auth, getMe);

// POST /api/auth/google
router.post("/google", googleLogin);

module.exports = router;
