const express = require("express");
const router = express.Router();
const sequelize = require("../config/database");
const { User } = require("../models");
const sendEmail = require("../config/mail");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");




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
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
        const refreshToken = jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
        res.json({ token, refreshToken });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la connexion" });
        console.error("Erreur de connexion:", error);

    }})

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


router.get("/getAllUsers", async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
    }
});


module.exports = router;
