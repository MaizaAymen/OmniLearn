const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const bcrypt = require("bcryptjs");
const { User, Class, Enrollment, Grade, Speciality, Level, Course, Module, Lesson, Announcement } = require("../models");
const { authenticate, requireAdmin } = require("../middleware/Authmiddleware");
const config = require("../config");

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// Lightweight user search for any authenticated user (used by messaging UI).
// GET /api/users-search?q=al
router.get("/users-search", async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const q = String(req.query.q || "").trim();
    const where = q
      ? {
          [Op.or]: [
            { firstname: { [Op.iLike]: `%${q}%` } },
            { lastname:  { [Op.iLike]: `%${q}%` } },
            { email:     { [Op.iLike]: `%${q}%` } },
          ],
        }
      : {};
    const users = await User.findAll({
      where,
      attributes: ["id", "firstname", "lastname", "email", "role"],
      limit: 30,
    });
    res.json(users.filter((u) => u.id !== req.user.id));
  } catch (err) {
    console.error("users-search:", err);
    res.status(500).json({ error: "Search failed" });
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
    const { firstname, lastname, email, password, currentPassword, role, bio, githubUrl, linkedinUrl, avatar, isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (user) {
      user.firstname = firstname ?? user.firstname;
      user.lastname = lastname ?? user.lastname;
      user.email = email ?? user.email;
      if (bio !== undefined) user.bio = bio;
      if (githubUrl !== undefined) user.githubUrl = githubUrl;
      if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl;
      if (avatar !== undefined) user.avatar = avatar; // null clears it
      // Self-deactivate or admin toggle
      if (isActive !== undefined) {
        if (req.user.role === "admin" || (req.user.id === req.params.id && isActive === false)) {
          user.isActive = isActive;
        }
      }
      if (req.user.role === "admin") user.role = role ?? user.role;

      // Update password only when explicitly provided.
      if (typeof password === "string" && password.trim().length > 0) {
        if (req.user.role !== "admin" && req.user.id === req.params.id) {
          if (!currentPassword) {
            return res.status(400).json({ error: "Current password is required to change password." });
          }
          const isMatch = await bcrypt.compare(currentPassword, user.password);
          if (!isMatch) {
            return res.status(400).json({ error: "Incorrect current password." });
          }
        }
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
router.post("/users/:id/avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "avatars", public_id: `avatar_${user.id}`, overwrite: true, transformation: [{ width: 300, height: 300, crop: "fill" }] },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    user.avatar = result.secure_url;
    await user.save();
    res.json({ avatar: result.secure_url });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    // Admin can delete anyone; users can delete their own account.
    if (req.user.role !== "admin" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
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

    // ─── PLAN GATE ────────────────────────────────────────────────────────
    // Les classrooms font partie du plan "institution".
    // Étape 1 : si l'utilisateur n'a pas un plan "institution", on bloque.
    // Étape 2 : on lui suggère d'utiliser un lien d'invitation d'institution.
    if (req.user.plan !== "institution") {
      return res.status(402).json({
        error: "Upgrade required",
        feature: "Classrooms are part of the Institution plan. Ask your school for an invite link.",
        upgradeTo: "institution",
      });
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


//yifasa5 lkol 
//
//
//
//
// ── Student classroom-view endpoints ────────────────────────────────────────
// Enrolled students (and admin/teacher) can read classroom content.

const canViewClassroom = async (user, classroomId) => {
  if (user.role === "admin" || user.role === "teacher") return true;
  const enrollment = await Enrollment.findOne({ where: { classId: classroomId, studentId: user.id } });
  return !!enrollment;
};

router.get("/student/classrooms/:id", async (req, res) => {
  try {
    if (!(await canViewClassroom(req.user, req.params.id))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }
    const classroom = await Class.findByPk(req.params.id, {
      include: [
        { model: Grade, as: "grade" },
        { model: Speciality, as: "speciality" },
        { model: Level, as: "level" },
        { model: User, as: "teacher", attributes: ["id", "firstname", "lastname"] },
        {
          model: Enrollment,
          as: "enrollments",
          include: [{ model: User, as: "student", attributes: ["id", "firstname", "lastname", "email", "avatar"] }],
        },
      ],
    });
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });
    res.json(classroom);
  } catch (err) {
    console.error("Error fetching student classroom:", err);
    res.status(500).json({ error: "Failed to fetch classroom" });
  }
});

router.get("/student/classrooms/:id/courses", async (req, res) => {
  try {
    if (!(await canViewClassroom(req.user, req.params.id))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }
    const courses = await Course.findAll({
      where: { classId: req.params.id },
      include: [{ model: Module, as: "modules", include: [{ model: Lesson, as: "lessons" }] }],
    });
    res.json(courses);
  } catch (err) {
    console.error("Error fetching student classroom courses:", err);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

router.get("/student/courses/:id/modules", async (req, res) => {
  try {
    const modules = await Module.findAll({
      where: { courseId: req.params.id },
      include: [{ model: Lesson, as: "lessons", order: [["order", "ASC"]] }],
      order: [["order", "ASC"]],
    });
    res.json(modules);
  } catch (err) {
    console.error("Error fetching student course modules:", err);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// Student: read announcements for a classroom they're enrolled in
router.get("/student/classrooms/:id/announcements", async (req, res) => {
  try {
    if (!(await canViewClassroom(req.user, req.params.id))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }
    const announcements = await Announcement.findAll({
      where: { classId: req.params.id },
      include: [
        { model: User, as: "author", attributes: ["id", "firstname", "lastname", "email", "role"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(announcements);
  } catch (err) {
    console.error("Error fetching student announcements:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.get("/student/modules/:id/lessons", async (req, res) => {
  try {
    const lessons = await Lesson.findAll({
      where: { moduleId: req.params.id },
      order: [["order", "ASC"]],
    });
    res.json(lessons);
  } catch (err) {
    console.error("Error fetching student module lessons:", err);
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
});

module.exports = router;