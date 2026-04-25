const express = require("express");
const router = express.Router();
const { User, Class, Enrollment, Grade, Speciality, Level } = require("../models");
const { authenticate, requireAdmin } = require("../middleware/Authmiddleware");

// All user routes require an authenticated user
router.use(authenticate);

router.get("/getAllUsers", requireAdmin, async (req, res) => {
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
router.post("/users", requireAdmin, async (req, res) => {
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
    // Only admin can update other users; users can update themselves but not their role
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { firstname, lastname, email, password, role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (user) {
      user.firstname = firstname ?? user.firstname;
      user.lastname = lastname ?? user.lastname;
      user.email = email ?? user.email;
      if (req.user.role === "admin") user.role = role ?? user.role;

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
router.delete("/users/:id", requireAdmin, async (req, res) => {
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

router.post("/join-classroom", async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "Invite code is required" });

    if (req.user.role !== "student") {
      return res.status(403).json({ error: "Only students can join classrooms via invite code" });
    }

    const classroom = await Class.findOne({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
    if (!classroom) return res.status(404).json({ error: "Invalid invite code" });

    if (!classroom.isActive) return res.status(403).json({ error: "This classroom is no longer active" });

    const [, created] = await Enrollment.findOrCreate({
      where: { classId: classroom.id, studentId: req.user.id },
      defaults: { status: "active" },
    });

    if (!created) return res.status(409).json({ error: "You are already enrolled in this classroom" });

    res.status(201).json({
      message: "Joined classroom successfully",
      classroom: { id: classroom.id, name: classroom.name, academicYear: classroom.academicYear },
    });
  } catch (err) {
    console.error("Error joining classroom:", err);
    res.status(500).json({ error: "Failed to join classroom" });
  }
});

router.get("/users/:id/classrooms", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const include = [
      { model: Grade, as: "grade", attributes: ["id", "name"] },
      { model: Speciality, as: "speciality", attributes: ["id", "name"] },
      { model: Level, as: "level", attributes: ["id", "name"] },
      { model: User, as: "teacher", attributes: ["id", "firstname", "lastname", "email"] },
    ];

    let classrooms = [];
    if (user.role === "teacher") {
      classrooms = await Class.findAll({
        where: { teacherId: user.id },
        include,
        order: [["createdAt", "DESC"]],
      });
    } else if (user.role === "student") {
      const enrollments = await Enrollment.findAll({
        where: { studentId: user.id },
        include: [{ model: Class, as: "class", include }],
      });
      classrooms = enrollments.map((e) => e.class).filter(Boolean);
    } else {
      classrooms = await Class.findAll({ include, order: [["createdAt", "DESC"]] });
    }

    res.json(classrooms);
  } catch (err) {
    console.error("Error fetching user classrooms:", err);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
});



module.exports = router;