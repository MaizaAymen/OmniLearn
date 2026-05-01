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
const { JWT_SECRET, JWT_REFRESH_SECRET } = require("../config");
const { authenticate } = require("../middleware/Authmiddleware");




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

router.post("/reset-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }
        const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
        await sendEmail({
            to: email,
            subject: "Réinitialisation de votre mot de passe",
            text: `Bonjour ${user.firstname},

Vous avez demandé une réinitialisation de votre mot de passe. Veuillez cliquer sur le lien suivant pour réinitialiser votre mot de passe :
${resetLink}

Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.

Cordialement,
L'équipe Learnflow
`,
        });
        res.json({ message: "Email de réinitialisation envoyé avec succès" });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'envoi du mail de réinitialisation" });
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
