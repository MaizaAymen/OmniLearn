const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { User } = require("../models");
const sendEmail = require("../config/mail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const { OAuth2Client } = require("google-auth-library");
const { JWT_SECRET, JWT_REFRESH_SECRET, GOOGLE_CLIENT_ID } = require("../config");
const { authenticate } = require("../middleware/Authmiddleware");

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function issueTokens(user) {
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      plan: user.plan,
      institutionId: user.institutionId,
      avatar: user.avatar,
    },
  };
}

// ─── Google Sign-In / Sign-Up ────────────────────────────────────────────────
// Frontend sends the Google ID token (credential). We verify it with Google,
// find or create the user, and return our own JWT.
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google login not configured" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name, family_name, picture } = payload;

    let user = await User.findOne({ where: { email } });
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    } else {
      user = await User.create({
        firstname: given_name || "User",
        lastname: family_name || "",
        email,
        googleId,
        avatar: picture || null,
        role: "student",
      });
    }

    res.json(issueTokens(user));
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Google authentication failed" });
  }
});




router.post("/register", async (req, res) => {
    try
{   
  const { firstname, lastname, email, password, role } = req.body;

if (!firstname) {
  return res.status(400).json({ error: "Le champ 'firstname' est obligatoire" });
}

if (!lastname) {
  return res.status(400).json({ error: "Le champ 'lastname' est obligatoire" });
}

if (!email) {
  return res.status(400).json({ error: "Le champ 'email' est obligatoire" });
}

if (!password) {
  return res.status(400).json({ error: "Le champ 'password' est obligatoire" });
}

  const mawjoud = await User.findOne({where: {email}})
  if (mawjoud) {
    return res.status(409).json({ error: "Email déjà utilisé" });}

  // password is hashed automatically by the model's beforeCreate hook
  const newUser = await User.create({
    firstname, lastname, email, password, role
  });
  sendEmail({
   to: email,
subject: "Bienvenue sur OmniLearn !",
text: `Bonjour ${firstname},

      Bienvenue sur OmniLearn !

Nous vous remercions chaleureusement pour votre inscription. 
Nous sommes ravis de vous compter parmi notre communauté d'apprentissage.

À très bientôt sur OmniLearn !

Cordialement,
Aymen Maiza
Fondateur de OmniLearn`,
html: `
  <p>Bonjour ${firstname},</p>
  <p>Bienvenue sur <strong>OmniLearn</strong> !</p>
  <p>Nous vous remercions chaleureusement pour votre inscription. 
  Nous sommes ravis de vous compter parmi notre communauté d'apprentissage.</p>
  <p>À très bientôt sur OmniLearn !</p>
  <p>Cordialement,<br><strong>Aymen Maiza</strong><br>Fondateur de OmniLearn</p>
`,

  }).catch((err) => console.error("Erreur lors de l'envoi de l'email:", err));
  res.status(201).json(newUser);
  
}
catch (error) {
    console.error("Erreur d'enregistrement:", error);
    res.status(500).json({ error: "Erreur lors de l'enregistrement de l'utilisateur" });

}})

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Mot de passe incorrect" });
        }

        // If 2FA is enabled, don't issue JWT yet — ask frontend for OTP
        if (user.is2FAEnabled) {
            return res.json({ require2FA: true, userId: user.id });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                role: user.role,
                plan: user.plan,
                institutionId: user.institutionId,
                avatar: user.avatar,
            },
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la connexion" });
        console.error("Erreur de connexion:", error);

    }})
    
router.post("/refresh-token", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token manquant" });
        }
        jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: "Refresh token invalide" });
            }
            const newToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
            res.json({ token: newToken });
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors du rafraîchissement du token" });
    }
});

// Step 1: Send password reset email
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Don't reveal if email exists (security)
            return res.json({ message: "If the email exists, a reset link has been sent" });
        }

        // Generate a secure reset token (expires in 1 hour)
        const resetToken = Date.now().toString(36) + Math.random().toString(36).slice(2);
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const resetLink = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

        await sendEmail({
            to: email,
            subject: "Reset your OmniLearn password",
            text: `Hello ${user.firstname},\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\nOmniLearn Team`,
            html: `
                <p>Hello <strong>${user.firstname}</strong>,</p>
                <p>We received a request to reset your password. Click the button below to create a new one:</p>
                <p>
                  <a href="${resetLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
                    Reset Password
                  </a>
                </p>
                <p style="color:#888;font-size:13px;">Or copy this link: ${resetLink}</p>
                <p style="color:#888;font-size:13px;">This link expires in 1 hour.</p>
                <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
                <p>— <strong>OmniLearn Team</strong></p>
            `,
        });

        res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ error: "Failed to process password reset request" });
    }
});

// Step 2: Verify reset token and reset password
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and new password are required" });
        }

        const user = await User.findOne({
            where: {
                passwordResetToken: token,
                passwordResetExpires: { [Op.gt]: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }

        // Hash and update password
        user.password = newPassword; // beforeCreate hook will hash it
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        // Send confirmation email
        await sendEmail({
            to: user.email,
            subject: "Your password has been reset",
            text: `Hello ${user.firstname},\n\nYour password has been successfully reset.\n\nIf you didn't request this, please contact support immediately.\n\nOmniLearn Team`,
            html: `
                <p>Hello <strong>${user.firstname}</strong>,</p>
                <p>Your password has been successfully reset.</p>
                <p style="color:#888;font-size:13px;">If you didn't request this, please contact support immediately.</p>
                <p>— <strong>OmniLearn Team</strong></p>
            `,
        }).catch(() => {});

        res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ error: "Failed to reset password" });
    }
});




// ─── 2FA Routes ───────────────────────────────────────────────────────────────

// Step 1: Generate a secret + QR code for the user to scan
router.post("/2fa/setup", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `OmniLearn (${user.email})`,
    });

    // Save the secret to the database (not yet enabled)
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Convert the otpauth URL to a QR code image (base64)
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.json({ qrCode });
  } catch (err) {
    console.error("2FA setup error:", err);
    res.status(500).json({ error: "Failed to setup 2FA" });
  }
});

// Step 2: Verify the first OTP and enable 2FA
router.post("/2fa/enable", authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA setup not started. Call /2fa/setup first." });
    }

    // Verify the OTP code (window: 1 allows 30s before/after)
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!isValid) return res.status(400).json({ error: "Invalid OTP code" });

    user.is2FAEnabled = true;
    await user.save();
    res.json({ message: "2FA enabled successfully" });
  } catch (err) {
    console.error("2FA enable error:", err);
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});

// Step 3: Verify OTP during login and return JWT
router.post("/2fa/verify", async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findByPk(userId);
    if (!user || !user.is2FAEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA not configured for this user" });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!isValid) return res.status(400).json({ error: "Invalid OTP code" });

    // OTP is correct — now issue the JWT
    const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    res.json({
      token: jwtToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        plan: user.plan,
        institutionId: user.institutionId,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("2FA verify error:", err);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// Disable 2FA (user must confirm with a valid OTP)
router.post("/2fa/disable", authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user || !user.is2FAEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA is not enabled" });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!isValid) return res.status(400).json({ error: "Invalid OTP code" });

    user.is2FAEnabled = false;
    user.twoFactorSecret = null;
    await user.save();
    res.json({ message: "2FA disabled successfully" });
  } catch (err) {
    console.error("2FA disable error:", err);
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

// ─── Google account linking (for users already logged in) ─────────────────────

router.post("/google/link", authenticate, async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential" });
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: "Google login not configured" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email: googleEmail, picture } = payload;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.googleId) {
      return res.status(400).json({ error: "Your account is already linked to Google" });
    }

    if (googleEmail.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({
        error: "The Google account email does not match your OmniLearn email",
      });
    }

    const existing = await User.findOne({ where: { googleId } });
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: "This Google account is already linked to another user" });
    }

    user.googleId = googleId;
    if (!user.avatar && picture) user.avatar = picture;
    await user.save();

    res.json({ message: "Google account linked successfully", googleId: user.googleId });
  } catch (err) {
    console.error("Google link error:", err);
    res.status(401).json({ error: "Failed to link Google account" });
  }
});

router.post("/google/unlink", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.googleId) return res.status(400).json({ error: "No Google account is linked" });
    if (!user.password) {
      return res.status(400).json({
        error: "Set a password before unlinking Google — otherwise you won't be able to log in.",
      });
    }

    user.googleId = null;
    await user.save();

    res.json({ message: "Google account unlinked successfully" });
  } catch (err) {
    console.error("Google unlink error:", err);
    res.status(500).json({ error: "Failed to unlink Google account" });
  }
});

// ─── Email Verification Routes ────────────────────────────────────────────────

// Send a verification email to the logged-in user
router.post("/send-verification-email", authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isEmailVerified) return res.status(400).json({ error: "Email is already verified" });

    const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your OmniLearn email",
      text: `Hello ${user.firstname},\n\nPlease verify your email by visiting:\n${verifyLink}\n\nThis link expires in 24 hours.\n\nOmniLearn Team`,
      html: `
        <p>Hello <strong>${user.firstname}</strong>,</p>
        <p>Click the button below to verify your email address:</p>
        <p>
          <a href="${verifyLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
            Verify Email
          </a>
        </p>
        <p style="color:#888;font-size:13px;">Or copy this link: ${verifyLink}</p>
        <p style="color:#888;font-size:13px;">This link expires in 24 hours.</p>
        <p>— <strong>OmniLearn Team</strong></p>
      `,
    });

    res.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("Send verification error:", err);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

// Confirm the token from the link the user clicked
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token missing" });

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ error: "Failed to verify email" });
  }
});

module.exports = router;
