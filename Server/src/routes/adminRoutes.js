const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  Grade,
  Speciality,
  Level,
  Course,
  Module,
  Lesson,
  Class,
  Enrollment,
  User,
  Announcement,
  Notification,
} = require("../models");
const { emitNotification } = require("../realtime/messageHub");

const LESSON_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "lesson-files");
if (!fs.existsSync(LESSON_UPLOAD_DIR)) {
  fs.mkdirSync(LESSON_UPLOAD_DIR, { recursive: true });
}

const lessonStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LESSON_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileId = `${Date.now()}-${safeName}`;
    cb(null, fileId);
  },
});

const lessonUpload = multer({ storage: lessonStorage });

const { authenticate, requireAdmin, requireAdminOrTeacher } = require("../middleware/Authmiddleware");

// Public lookup by invite code (defined before the global guard below)
router.get("/classrooms/join/:code", async (req, res) => {
  try {
    const classroom = await Class.findOne({ where: { inviteCode: req.params.code } });
    if (!classroom) return res.status(404).json({ error: "Invalid invite code" });
    res.json({ id: classroom.id, name: classroom.name, academicYear: classroom.academicYear });
  } catch (error) {
    res.status(500).json({ error: "Failed to find classroom" });
  }
});

// Everything below requires authentication
router.use(authenticate);

// Grades / Specialities / Levels: admin only (curriculum structure)
const adminOnlyPaths = [
  "/grades", "/grades/:id",
  "/specialities", "/specialities/:id", "/grades/:gradeId/specialities",
  "/levels", "/levels/:id", "/specialities/:specialityId/levels",
];
router.use((req, res, next) => {
  const isWriteOnAdminEntity =
    ["POST", "PUT", "DELETE"].includes(req.method) &&
    /^\/(grades|specialities|levels)(\/|$)/.test(req.path);
  if (isWriteOnAdminEntity) return requireAdmin(req, res, next);
  next();
});

// Everything else (courses/modules/lessons/classrooms/students/stats): admin or teacher
router.use(requireAdminOrTeacher);

// Helpers: a teacher can only touch classrooms/courses/modules/lessons they own.
// Admin bypasses every check.
const isAdmin = (req) => req.user.role === "admin";

const ownsClassroom = async (req, classroomId) => {
  if (isAdmin(req)) return true;
  const c = await Class.findByPk(classroomId);
  return !!(c && c.teacherId === req.user.id);
};

const ownsCourse = async (req, courseId) => {
  if (isAdmin(req)) return true;
  const c = await Course.findByPk(courseId);
  return !!(c && c.teacherId === req.user.id);
};

const ownsModule = async (req, moduleId) => {
  if (isAdmin(req)) return true;
  const m = await Module.findByPk(moduleId);
  if (!m) return false;
  return ownsCourse(req, m.courseId);
};

const ownsLesson = async (req, lessonId) => {
  if (isAdmin(req)) return true;
  const l = await Lesson.findByPk(lessonId);
  if (!l) return false;
  if (l.moduleId) return ownsModule(req, l.moduleId);
  if (l.courseId) return ownsCourse(req, l.courseId);
  return false;
};

const forbid = (res) => res.status(403).json({ error: "You can only manage your own classrooms and their content." });

// Ownership guards on writes (PUT/DELETE/POST sub-resources)
router.use(async (req, res, next) => {
  try {
    if (isAdmin(req)) return next();
    if (!["PUT", "DELETE", "POST"].includes(req.method)) return next();

    const m = req.path.match(/^\/(classrooms|courses|modules|lessons)\/([^/]+)(\/(.*))?$/);
    if (!m) return next();
    const [, kind, id] = m;
    // skip non-UUID sub-paths like /lessons/upload
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(id)) return next();

    let allowed = true;
    if (kind === "classrooms") allowed = await ownsClassroom(req, id);
    else if (kind === "courses") allowed = await ownsCourse(req, id);
    else if (kind === "modules") allowed = await ownsModule(req, id);
    else if (kind === "lessons") allowed = await ownsLesson(req, id);

    if (!allowed) return forbid(res);
    next();
  } catch (e) {
    console.error("Ownership guard error:", e);
    res.status(500).json({ error: "Authorization check failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all grades
router.get("/grades", async (req, res) => {
  try {
    const grades = await Grade.findAll({
      order: [["order", "ASC"], ["createdAt", "DESC"]],
    });
    res.json(grades);
  } catch (error) {
    console.error("Error fetching grades:", error);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

// Get single grade with specialities
router.get("/grades/:id", async (req, res) => {
  try {
    const grade = await Grade.findByPk(req.params.id, {
      include: [{ model: Speciality, as: "specialities" }],
    });
    if (!grade) {
      return res.status(404).json({ error: "Grade not found" });
    }
    res.json(grade);
  } catch (error) {
    console.error("Error fetching grade:", error);
    res.status(500).json({ error: "Failed to fetch grade" });
  }
});

// Create grade
router.post("/grades", async (req, res) => {
  try {
    const { name, displayName, description, order, isActive } = req.body;
    const grade = await Grade.create({
      name,
      displayName,
      description,
      order: order || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(grade);
  } catch (error) {
    console.error("Error creating grade:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ error: "Grade name already exists" });
    }
    res.status(500).json({ error: "Failed to create grade" });
  }
});

// Update grade
router.put("/grades/:id", async (req, res) => {
  try {
    const grade = await Grade.findByPk(req.params.id);
    if (!grade) {
      return res.status(404).json({ error: "Grade not found" });
    }
    const { name, displayName, description, order, isActive } = req.body;
    await grade.update({
      name: name ?? grade.name,
      displayName: displayName ?? grade.displayName,
      description: description ?? grade.description,
      order: order ?? grade.order,
      isActive: isActive ?? grade.isActive,
    });
    res.json(grade);
  } catch (error) {
    console.error("Error updating grade:", error);
    res.status(500).json({ error: "Failed to update grade" });
  }
});

// Delete grade
router.delete("/grades/:id", async (req, res) => {
  try {
    const grade = await Grade.findByPk(req.params.id);
    if (!grade) {
      return res.status(404).json({ error: "Grade not found" });
    }
    await grade.destroy();
    res.json({ message: "Grade deleted successfully" });
  } catch (error) {
    console.error("Error deleting grade:", error);
    res.status(500).json({ error: "Failed to delete grade" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALITY ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all specialities (optionally filter by gradeId)
router.get("/specialities", async (req, res) => {
  try {
    const { gradeId } = req.query;
    const where = gradeId ? { gradeId } : {};
    const specialities = await Speciality.findAll({
      where,
      include: [{ model: Grade, as: "grade", attributes: ["id", "name", "displayName"] }],
      order: [["order", "ASC"], ["createdAt", "DESC"]],
    });
    res.json(specialities);
  } catch (error) {
    console.error("Error fetching specialities:", error);
    res.status(500).json({ error: "Failed to fetch specialities" });
  }
});

// Get specialities by grade
router.get("/grades/:gradeId/specialities", async (req, res) => {
  try {
    const specialities = await Speciality.findAll({
      where: { gradeId: req.params.gradeId },
      order: [["order", "ASC"]],
    });
    res.json(specialities);
  } catch (error) {
    console.error("Error fetching specialities:", error);
    res.status(500).json({ error: "Failed to fetch specialities" });
  }
});

// Get single speciality with levels
router.get("/specialities/:id", async (req, res) => {
  try {
    const speciality = await Speciality.findByPk(req.params.id, {
      include: [
        { model: Grade, as: "grade" },
        { model: Level, as: "levels" },
      ],
    });
    if (!speciality) {
      return res.status(404).json({ error: "Speciality not found" });
    }
    res.json(speciality);
  } catch (error) {
    console.error("Error fetching speciality:", error);
    res.status(500).json({ error: "Failed to fetch speciality" });
  }
});

// Create speciality
router.post("/specialities", async (req, res) => {
  try {
    const { gradeId, name, displayName, description, icon, order, isActive } = req.body;
    if (!gradeId) {
      return res.status(400).json({ error: "gradeId is required" });
    }
    const speciality = await Speciality.create({
      gradeId,
      name,
      displayName,
      description,
      icon,
      order: order || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(speciality);
  } catch (error) {
    console.error("Error creating speciality:", error);
    res.status(500).json({ error: "Failed to create speciality" });
  }
});

// Update speciality
router.put("/specialities/:id", async (req, res) => {
  try {
    const speciality = await Speciality.findByPk(req.params.id);
    if (!speciality) {
      return res.status(404).json({ error: "Speciality not found" });
    }
    const { gradeId, name, displayName, description, icon, order, isActive } = req.body;
    await speciality.update({
      gradeId: gradeId ?? speciality.gradeId,
      name: name ?? speciality.name,
      displayName: displayName ?? speciality.displayName,
      description: description ?? speciality.description,
      icon: icon ?? speciality.icon,
      order: order ?? speciality.order,
      isActive: isActive ?? speciality.isActive,
    });
    res.json(speciality);
  } catch (error) {
    console.error("Error updating speciality:", error);
    res.status(500).json({ error: "Failed to update speciality" });
  }
});

// Delete speciality
router.delete("/specialities/:id", async (req, res) => {
  try {
    const speciality = await Speciality.findByPk(req.params.id);
    if (!speciality) {
      return res.status(404).json({ error: "Speciality not found" });
    }
    await speciality.destroy();
    res.json({ message: "Speciality deleted successfully" });
  } catch (error) {
    console.error("Error deleting speciality:", error);
    res.status(500).json({ error: "Failed to delete speciality" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all levels (optionally filter by specialityId)
router.get("/levels", async (req, res) => {
  try {
    const { specialityId } = req.query;
    const where = specialityId ? { specialityId } : {};
    const levels = await Level.findAll({
      where,
      include: [
        {
          model: Speciality,
          as: "speciality",
          attributes: ["id", "name", "displayName"],
          include: [{ model: Grade, as: "grade", attributes: ["id", "name", "displayName"] }],
        },
      ],
      order: [["order", "ASC"], ["createdAt", "DESC"]],
    });
    res.json(levels);
  } catch (error) {
    console.error("Error fetching levels:", error);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

// Get levels by speciality
router.get("/specialities/:specialityId/levels", async (req, res) => {
  try {
    const levels = await Level.findAll({
      where: { specialityId: req.params.specialityId },
      order: [["order", "ASC"]],
    });
    res.json(levels);
  } catch (error) {
    console.error("Error fetching levels:", error);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

// Get single level with courses
router.get("/levels/:id", async (req, res) => {
  try {
    const level = await Level.findByPk(req.params.id, {
      include: [
        { model: Speciality, as: "speciality", include: [{ model: Grade, as: "grade" }] },
        { model: Course, as: "courses" },
      ],
    });
    if (!level) {
      return res.status(404).json({ error: "Level not found" });
    }
    res.json(level);
  } catch (error) {
    console.error("Error fetching level:", error);
    res.status(500).json({ error: "Failed to fetch level" });
  }
});

// Create level
router.post("/levels", async (req, res) => {
  try {
    const { specialityId, name, displayName, description, order, isActive } = req.body;
    if (!specialityId) {
      return res.status(400).json({ error: "specialityId is required" });
    }
    const level = await Level.create({
      specialityId,
      name,
      displayName,
      description,
      order: order || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(level);
  } catch (error) {
    console.error("Error creating level:", error);
    res.status(500).json({ error: "Failed to create level" });
  }
});

// Update level
router.put("/levels/:id", async (req, res) => {
  try {
    const level = await Level.findByPk(req.params.id);
    if (!level) {
      return res.status(404).json({ error: "Level not found" });
    }
    const { specialityId, name, displayName, description, order, isActive } = req.body;
    await level.update({
      specialityId: specialityId ?? level.specialityId,
      name: name ?? level.name,
      displayName: displayName ?? level.displayName,
      description: description ?? level.description,
      order: order ?? level.order,
      isActive: isActive ?? level.isActive,
    });
    res.json(level);
  } catch (error) {
    console.error("Error updating level:", error);
    res.status(500).json({ error: "Failed to update level" });
  }
});

// Delete level
router.delete("/levels/:id", async (req, res) => {
  try {
    const level = await Level.findByPk(req.params.id);
    if (!level) {
      return res.status(404).json({ error: "Level not found" });
    }
    await level.destroy();
    res.json({ message: "Level deleted successfully" });
  } catch (error) {
    console.error("Error deleting level:", error);
    res.status(500).json({ error: "Failed to delete level" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COURSE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all courses (optionally filter by levelId)
router.get("/courses", async (req, res) => {
  try {
    const { levelId } = req.query;
    const where = levelId ? { levelId } : {};
    if (req.user.role === "teacher") where.teacherId = req.user.id;
    const courses = await Course.findAll({
      where,
      include: [
        {
          model: Level,
          as: "level",
          attributes: ["id", "name", "displayName"],
          include: [
            {
              model: Speciality,
              as: "speciality",
              attributes: ["id", "name"],
              include: [{ model: Grade, as: "grade", attributes: ["id", "name"] }],
            },
          ],
        },
        { model: User, as: "teacher", attributes: ["id", "firstname", "lastname"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Get courses by level
router.get("/levels/:levelId/courses", async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { levelId: req.params.levelId },
      include: [{ model: User, as: "teacher", attributes: ["id", "firstname", "lastname"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Get single course with modules
router.get("/courses/:id", async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: Level, as: "level", include: [{ model: Speciality, as: "speciality" }] },
        { model: User, as: "teacher", attributes: ["id", "firstname", "lastname"] },
        {
          model: Module,
          as: "modules",
          include: [{ model: Lesson, as: "lessons", order: [["order", "ASC"]] }],
          order: [["order", "ASC"]],
        },
      ],
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

// Create course
router.post("/courses", async (req, res) => {
  try {
    let {
      levelId,
      classId,
      title,
      description,
      teacherId,
      subject,
      difficulty,
      thumbnail,
      isPublished,
      estimatedDuration,
    } = req.body;
    if (!levelId && classId) {
      const classroom = await Class.findByPk(classId);
      if (classroom) levelId = classroom.levelId;
    }
    if (!levelId || !title) {
      return res.status(400).json({ error: "levelId and title are required" });
    }
    // Teachers can only create courses owned by themselves and only in classrooms they own.
    if (req.user.role === "teacher") {
      teacherId = req.user.id;
      if (classId) {
        const cls = await Class.findByPk(classId);
        if (!cls || cls.teacherId !== req.user.id) {
          return res.status(403).json({ error: "You can only add courses to your own classrooms." });
        }
      }
    }
    const course = await Course.create({
      levelId,
      classId: classId || null,
      title,
      description,
      teacherId,
      subject,
      difficulty: difficulty || "beginner",
      thumbnail,
      isPublished: isPublished || false,
      estimatedDuration,
    });
    res.status(201).json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

// Update course
router.put("/courses/:id", async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    const {
      levelId,
      title,
      description,
      teacherId,
      subject,
      difficulty,
      thumbnail,
      isPublished,
      estimatedDuration,
    } = req.body;
    await course.update({
      levelId: levelId ?? course.levelId,
      title: title ?? course.title,
      description: description ?? course.description,
      teacherId: teacherId ?? course.teacherId,
      subject: subject ?? course.subject,
      difficulty: difficulty ?? course.difficulty,
      thumbnail: thumbnail ?? course.thumbnail,
      isPublished: isPublished ?? course.isPublished,
      estimatedDuration: estimatedDuration ?? course.estimatedDuration,
    });
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// Delete course
router.delete("/courses/:id", async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    await course.destroy();
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all modules (optionally filter by courseId)
router.get("/modules", async (req, res) => {
  try {
    const { courseId } = req.query;
    const where = courseId ? { courseId } : {};
    if (req.user.role === "teacher") {
      const myCourses = await Course.findAll({ where: { teacherId: req.user.id }, attributes: ["id"] });
      const ids = myCourses.map((c) => c.id);
      where.courseId = where.courseId
        ? (ids.includes(where.courseId) ? where.courseId : "__none__")
        : ids.length ? ids : ["__none__"];
    }
    const modules = await Module.findAll({
      where,
      include: [
        { model: Course, as: "course", attributes: ["id", "title"] },
        { model: Lesson, as: "lessons" },
      ],
      order: [["order", "ASC"]],
    });
    res.json(modules);
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// Get modules by course
router.get("/courses/:courseId/modules", async (req, res) => {
  try {
    const modules = await Module.findAll({
      where: { courseId: req.params.courseId },
      include: [{ model: Lesson, as: "lessons", order: [["order", "ASC"]] }],
      order: [["order", "ASC"]],
    });
    res.json(modules);
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// Get single module with lessons
router.get("/modules/:id", async (req, res) => {
  try {
    const module = await Module.findByPk(req.params.id, {
      include: [
        { model: Course, as: "course" },
        { model: Lesson, as: "lessons", order: [["order", "ASC"]] },
      ],
    });
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    res.json(module);
  } catch (error) {
    console.error("Error fetching module:", error);
    res.status(500).json({ error: "Failed to fetch module" });
  }
});

// Create module
router.post("/modules", async (req, res) => {
  try {
    const { courseId, title, description, order, isPublished } = req.body;
    if (!courseId || !title) {
      return res.status(400).json({ error: "courseId and title are required" });
    }
    if (req.user.role === "teacher" && !(await ownsCourse(req, courseId))) {
      return res.status(403).json({ error: "You can only add modules to your own courses." });
    }
    const module = await Module.create({
      courseId,
      title,
      description,
      order: order || 0,
      isPublished: isPublished || false,
    });
    res.status(201).json(module);
  } catch (error) {
    console.error("Error creating module:", error);
    res.status(500).json({ error: "Failed to create module" });
  }
});

// Update module
router.put("/modules/:id", async (req, res) => {
  try {
    const module = await Module.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    const { courseId, title, description, order, isPublished } = req.body;
    await module.update({
      courseId: courseId ?? module.courseId,
      title: title ?? module.title,
      description: description ?? module.description,
      order: order ?? module.order,
      isPublished: isPublished ?? module.isPublished,
    });
    res.json(module);
  } catch (error) {
    console.error("Error updating module:", error);
    res.status(500).json({ error: "Failed to update module" });
  }
});

// Delete module
router.delete("/modules/:id", async (req, res) => {
  try {
    const module = await Module.findByPk(req.params.id);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    await module.destroy();
    res.json({ message: "Module deleted successfully" });
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).json({ error: "Failed to delete module" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENT ROUTES (classroom-level, like Google Classroom stream)
// ═══════════════════════════════════════════════════════════════════════════════

// List announcements for a classroom
router.get("/classrooms/:classId/announcements", async (req, res) => {
  try {
    const classroom = await Class.findByPk(req.params.classId);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const announcements = await Announcement.findAll({
      where: { classId: req.params.classId },
      include: [
        { model: User, as: "author", attributes: ["id", "firstname", "lastname", "email", "role"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Create an announcement in a classroom
router.post("/classrooms/:classId/announcements", async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }
    const classroom = await Class.findByPk(classId);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    if (req.user.role === "teacher" && !(await ownsClassroom(req, classId))) {
      return res.status(403).json({ error: "You can only post announcements in your own classrooms." });
    }

    const announcement = await Announcement.create({
      classId,
      authorId: req.user.id,
      title: title?.trim() || null,
      content: content.trim(),
    });
    const full = await Announcement.findByPk(announcement.id, {
      include: [
        { model: User, as: "author", attributes: ["id", "firstname", "lastname", "email", "role"] },
      ],
    });
    res.status(201).json(full);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// Delete an announcement (author or admin)
router.delete("/announcements/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ error: "Announcement not found" });
    if (!isAdmin(req) && announcement.authorId !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own announcements." });
    }
    await announcement.destroy();
    res.json({ message: "Announcement deleted" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LESSON ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all lessons (optionally filter by moduleId)
router.get("/lessons", async (req, res) => {
  try {
    const { moduleId } = req.query;
    const where = moduleId ? { moduleId } : {};
    if (req.user.role === "teacher") {
      const myCourses = await Course.findAll({ where: { teacherId: req.user.id }, attributes: ["id"] });
      const courseIds = myCourses.map((c) => c.id);
      const myModules = courseIds.length
        ? await Module.findAll({ where: { courseId: courseIds }, attributes: ["id"] })
        : [];
      const moduleIds = myModules.map((m) => m.id);
      where.moduleId = where.moduleId
        ? (moduleIds.includes(where.moduleId) ? where.moduleId : "__none__")
        : moduleIds.length ? moduleIds : ["__none__"];
    }
    const lessons = await Lesson.findAll({
      where,
      include: [{ model: Module, as: "module", attributes: ["id", "title"] }],
      order: [["order", "ASC"]],
    });
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
});

// Upload lesson file (code or other attachments)
router.post("/lessons/upload", lessonUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    res.json({
      fileUrl: `/uploads/lesson-files/${req.file.filename}`,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
  } catch (error) {
    console.error("Lesson upload error:", error);
    res.status(500).json({ error: "Failed to upload lesson file" });
  }
});

// Get lessons by module
router.get("/modules/:moduleId/lessons", async (req, res) => {
  try {
    const lessons = await Lesson.findAll({
      where: { moduleId: req.params.moduleId },
      order: [["order", "ASC"]],
    });
    res.json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
});

// Get single lesson
router.get("/lessons/:id", async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id, {
      include: [{ model: Module, as: "module", include: [{ model: Course, as: "course" }] }],
    });
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    res.json(lesson);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

// Create lesson
router.post("/lessons", async (req, res) => {
  try {
    const { moduleId, courseId, title, type, contentUrl, description, duration, order, isPublished } =
      req.body;
    if (!title || (!moduleId && !courseId)) {
      return res.status(400).json({ error: "title and either moduleId or courseId are required" });
    }
    if (req.user.role === "teacher") {
      const ok = moduleId ? await ownsModule(req, moduleId) : await ownsCourse(req, courseId);
      if (!ok) return res.status(403).json({ error: "You can only add lessons inside your own modules/courses." });
    }
    const lesson = await Lesson.create({
      moduleId: moduleId || null,
      courseId: courseId || null,
      title,
      type: type || "pdf",
      contentUrl,
      description,
      duration,
      order: order || 0,
      isPublished: isPublished || false,
    });
    res.status(201).json(lesson);
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ error: "Failed to create lesson" });
  }
});

// Update lesson
router.put("/lessons/:id", async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    const { moduleId, title, type, contentUrl, description, duration, order, isPublished } =
      req.body;
    await lesson.update({
      moduleId: moduleId ?? lesson.moduleId,
      title: title ?? lesson.title,
      type: type ?? lesson.type,
      contentUrl: contentUrl ?? lesson.contentUrl,
      description: description ?? lesson.description,
      duration: duration ?? lesson.duration,
      order: order ?? lesson.order,
      isPublished: isPublished ?? lesson.isPublished,
    });
    res.json(lesson);
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

// Delete lesson
router.delete("/lessons/:id", async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    await lesson.destroy();
    res.json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSROOM ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all classrooms
router.get("/classrooms", async (req, res) => {
  try {
    const { gradeId, specialityId, levelId } = req.query;
    const where = {};
    if (gradeId) where.gradeId = gradeId;
    if (specialityId) where.specialityId = specialityId;
    if (levelId) where.levelId = levelId;

    if (req.user.role === "teacher") where.teacherId = req.user.id;

    const classrooms = await Class.findAll({
      where,
      include: [
        { model: Grade, as: "grade", attributes: ["id", "name", "displayName"] },
        { model: Speciality, as: "speciality", attributes: ["id", "name", "displayName"] },
        { model: Level, as: "level", attributes: ["id", "name", "displayName"] },
        { model: User, as: "teacher", attributes: ["id", "firstname", "lastname"] },
        {
          model: Enrollment,
          as: "enrollments",
          include: [{ model: User, as: "student", attributes: ["id", "firstname", "lastname", "email"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(classrooms);
  } catch (error) {
    console.error("Error fetching classrooms:", error);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
});

// Get single classroom with students and inherited courses
router.get("/classrooms/:id", async (req, res) => {
  try {
    const classroom = await Class.findByPk(req.params.id, {
      include: [
        { model: Grade, as: "grade" },
        { model: Speciality, as: "speciality" },
        {
          model: Level,
          as: "level",
          include: [
            {
              model: Course,
              as: "courses",
              include: [{ model: Module, as: "modules" }],
            },
          ],
        },
        { model: User, as: "teacher", attributes: ["id", "firstname", "lastname"] },
        {
          model: Enrollment,
          as: "enrollments",
          include: [{ model: User, as: "student", attributes: ["id", "firstname", "lastname", "email", "avatar"] }],
        },
      ],
    });
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }
    res.json(classroom);
  } catch (error) {
    console.error("Error fetching classroom:", error);
    res.status(500).json({ error: "Failed to fetch classroom" });
  }
});

// Get courses directly assigned to this classroom
router.get("/classrooms/:id/courses", async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { classId: req.params.id },
      include: [
        { model: Module, as: "modules", include: [{ model: Lesson, as: "lessons" }] },
      ],
    });
    res.json(courses);
  } catch (error) {
    console.error("Error fetching classroom courses:", error);
    res.status(500).json({ error: "Failed to fetch classroom courses" });
  }
});

// Get classroom modules (direct assignments)
router.get("/classrooms/:id/modules", async (req, res) => {
  try {
    const classroom = await Class.findByPk(req.params.id, {
      include: [{ model: Module, as: "modules" }],
    });
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }
    res.json(classroom.modules || []);
  } catch (error) {
    console.error("Error fetching classroom modules:", error);
    res.status(500).json({ error: "Failed to fetch classroom modules" });
  }
});

// Assign module to classroom
router.post("/classrooms/:id/modules", async (req, res) => {
  try {
    const { moduleId } = req.body;
    if (!moduleId) {
      return res.status(400).json({ error: "moduleId is required" });
    }
    const classroom = await Class.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }
    const module = await Module.findByPk(moduleId);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }
    await classroom.addModule(module);
    res.status(201).json({ message: "Module assigned" });
  } catch (error) {
    console.error("Error assigning classroom module:", error);
    res.status(500).json({ error: "Failed to assign module" });
  }
});

// Remove module from classroom
router.delete("/classrooms/:id/modules/:moduleId", async (req, res) => {
  try {
    const classroom = await Class.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }
    await classroom.removeModule(req.params.moduleId);
    res.json({ message: "Module removed" });
  } catch (error) {
    console.error("Error removing classroom module:", error);
    res.status(500).json({ error: "Failed to remove module" });
  }
});

// Generate a unique 6-char alphanumeric invite code
const generateInviteCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  let exists = true;
  while (exists) {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    exists = !!(await Class.findOne({ where: { inviteCode: code } }));
  }
  return code;
};

// Create classroom
router.post("/classrooms", async (req, res) => {
  try {
    let { name, description, teacherId, gradeId, specialityId, levelId, academicYear, isActive } =
      req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    // A teacher always becomes the owner of classrooms they create
    if (req.user.role === "teacher") {
      teacherId = req.user.id;
    }
    const inviteCode = await generateInviteCode();
    const classroom = await Class.create({
      name,
      description,
      teacherId,
      gradeId,
      specialityId,
      levelId,
      academicYear,
      isActive: isActive !== false,
      inviteCode,
    });
    res.status(201).json(classroom);
  } catch (error) {
    console.error("Error creating classroom:", error);
    res.status(500).json({ error: "Failed to create classroom" });
  }
});

// Update classroom
router.put("/classrooms/:id", async (req, res) => {
  try {
    const classroom = await Class.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }
    const { name, description, teacherId, gradeId, specialityId, levelId, academicYear, isActive } =
      req.body;
    await classroom.update({
      name: name ?? classroom.name,
      description: description ?? classroom.description,
      teacherId: teacherId ?? classroom.teacherId,
      gradeId: gradeId ?? classroom.gradeId,
      specialityId: specialityId ?? classroom.specialityId,
      levelId: levelId ?? classroom.levelId,
      academicYear: academicYear ?? classroom.academicYear,
      isActive: isActive ?? classroom.isActive,
    });
    res.json(classroom);
  } catch (error) {
    console.error("Error updating classroom:", error);
    res.status(500).json({ error: "Failed to update classroom" });
  }
});

// Delete classroom
router.delete("/classrooms/:id", async (req, res) => {
  try {
    const classroom = await Class.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }
    await classroom.destroy();
    res.json({ message: "Classroom deleted successfully" });
  } catch (error) {
    console.error("Error deleting classroom:", error);
    res.status(500).json({ error: "Failed to delete classroom" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ENROLLMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get students available for enrollment (not in classroom)
router.get("/students/available", async (req, res) => {
  try {
    const { classroomId } = req.query;
    let excludeIds = [];

    if (classroomId) {
      const enrollments = await Enrollment.findAll({
        where: { classId: classroomId },
        attributes: ["studentId"],
      });
      excludeIds = enrollments.map((e) => e.studentId);
    }

    const students = await User.findAll({
      where: {
        role: "student",
        isActive: true,
        ...(excludeIds.length > 0 && {
          id: { [require("sequelize").Op.notIn]: excludeIds },
        }),
      },
      attributes: ["id", "firstname", "lastname", "email"],
      order: [["firstname", "ASC"]],
    });
    res.json(students);
  } catch (error) {
    console.error("Error fetching available students:", error);
    res.status(500).json({ error: "Failed to fetch available students" });
  }
});

// Get students enrolled in a classroom
router.get("/classrooms/:id/students", async (req, res) => {
  try {
    const enrollments = await Enrollment.findAll({
      where: { classId: req.params.id },
      include: [{ model: User, as: "student", attributes: ["id", "firstname", "lastname", "email"] }],
    });
    const students = enrollments.map((e) => e.student).filter(Boolean);
    res.json(students);
  } catch (error) {
    console.error("Error fetching classroom students:", error);
    res.status(500).json({ error: "Failed to fetch classroom students" });
  }
});

// Send classroom invitations to students (they must accept).
router.post("/classrooms/:id/students", async (req, res) => {
  try {
    const { studentIds } = req.body;
    const classroomId = req.params.id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: "studentIds array is required" });
    }

    const classroom = await Class.findByPk(classroomId);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    const inviterName =
      `${req.user.firstname || ""} ${req.user.lastname || ""}`.trim() || "Your teacher";
    const io = req.app.get("io");

    const invitations = [];
    for (const studentId of studentIds) {
      // Skip students already enrolled.
      const existing = await Enrollment.findOne({
        where: { classId: classroomId, studentId },
      });
      if (existing) continue;

      // Skip duplicate pending invites for this classroom.
      const dup = await Notification.findOne({
        where: { userId: studentId, type: "classroom-invite", isRead: false },
      });
      if (dup && dup.data && dup.data.classId === classroomId) continue;

      const notif = await Notification.create({
        userId: studentId,
        type: "classroom-invite",
        title: "Classroom invitation",
        message: `${inviterName} invited you to join "${classroom.name}"`,
        data: { classId: classroomId, classroomName: classroom.name, inviterName },
      });
      emitNotification(io, studentId, notif);
      invitations.push(notif);
    }

    res.status(201).json({ message: "Invitations sent", invitations });
  } catch (error) {
    console.error("Error sending invitations:", error);
    res.status(500).json({ error: "Failed to send invitations" });
  }
});

// Remove student from classroom
router.delete("/classrooms/:id/students/:studentId", async (req, res) => {
  try {
    const { id: classroomId, studentId } = req.params;

    const enrollment = await Enrollment.findOne({
      where: { classId: classroomId, studentId },
    });

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    await enrollment.destroy();
    res.json({ message: "Student removed from classroom" });
  } catch (error) {
    console.error("Error removing student:", error);
    res.status(500).json({ error: "Failed to remove student" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/stats", async (req, res) => {
  try {
    const [
      gradesCount,
      specialitiesCount,
      levelsCount,
      coursesCount,
      modulesCount,
      lessonsCount,
      classroomsCount,
      studentsCount,
      teachersCount,
    ] = await Promise.all([
      Grade.count(),
      Speciality.count(),
      Level.count(),
      Course.count(),
      Module.count(),
      Lesson.count(),
      Class.count(),
      User.count({ where: { role: "student" } }),
      User.count({ where: { role: "teacher" } }),
    ]);

    res.json({
      grades: gradesCount,
      specialities: specialitiesCount,
      levels: levelsCount,
      courses: coursesCount,
      modules: modulesCount,
      lessons: lessonsCount,
      classrooms: classroomsCount,
      students: studentsCount,
      teachers: teachersCount,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

module.exports = router;
