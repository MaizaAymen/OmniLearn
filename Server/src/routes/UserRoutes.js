const express = require("express");
const router = express.Router();
const { User } = require("../models");


router.get("/getAllUsers", async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
    }
});
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
router.post("/users", async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;
    const newUser = await User.create({ firstname, lastname, email, password, role });
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});
router.put("/users/:id", async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (user) {
      user.firstname = firstname ?? user.firstname;
      user.lastname = lastname ?? user.lastname;
      user.email = email ?? user.email;
      user.role = role ?? user.role;

      // Update password only when explicitly provided.
      if (typeof password === "string" && password.trim().length > 0) {
        user.password = password;
      }

      await user.save();
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      await user.destroy();
      res.json({ message: "User deleted" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});


router.post("/completeProfile", async (req, res) => {
  try {
    const { userId, profileData } = req.body;
    const user = await User.findByPk(userId);
    if (user) {
      // Update user profile with profileData
      await user.update(profileData);
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to complete profile" });
  }
});
router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});


module.exports = router;