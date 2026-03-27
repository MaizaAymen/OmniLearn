const express = require("express");
const router = express.Router();
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
} = require("../models");
const { authenticate, requireAdmin } = require("../middleware/Authmiddleware");

// Apply authentication and admin check to all routes
router.use(authenticate);
router.use(requireAdmin);

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
    if (!levelId || !title) {
      return res.status(400).json({ error: "levelId and title are required" });
    }
    const course = await Course.create({
      levelId,
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
// LESSON ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all lessons (optionally filter by moduleId)
router.get("/lessons", async (req, res) => {
  try {
    const { moduleId } = req.query;
    const where = moduleId ? { moduleId } : {};
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
    const { moduleId, title, type, contentUrl, description, duration, order, isPublished } =
      req.body;
    if (!moduleId || !title) {
      return res.status(400).json({ error: "moduleId and title are required" });
    }
    const lesson = await Lesson.create({
      moduleId,
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
          include: [{ model: User, as: "student", attributes: ["id", "firstname", "lastname", "email"] }],
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

// Get classroom's inherited courses (through Level)
router.get("/classrooms/:id/courses", async (req, res) => {
  try {
    const classroom = await Class.findByPk(req.params.id, {
      include: [
        {
          model: Level,
          as: "level",
          include: [
            {
              model: Course,
              as: "courses",
              include: [
                { model: Module, as: "modules", include: [{ model: Lesson, as: "lessons" }] },
              ],
            },
          ],
        },
      ],
    });
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }
    const courses = classroom.level?.courses || [];
    res.json(courses);
  } catch (error) {
    console.error("Error fetching classroom courses:", error);
    res.status(500).json({ error: "Failed to fetch classroom courses" });
  }
});

// Create classroom
router.post("/classrooms", async (req, res) => {
  try {
    const { name, description, teacherId, gradeId, specialityId, levelId, academicYear, isActive } =
      req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const classroom = await Class.create({
      name,
      description,
      teacherId,
      gradeId,
      specialityId,
      levelId,
      academicYear,
      isActive: isActive !== false,
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

// Assign students to classroom
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

    const enrollments = await Promise.all(
      studentIds.map(async (studentId) => {
        const [enrollment] = await Enrollment.findOrCreate({
          where: { classId: classroomId, studentId },
          defaults: { classId: classroomId, studentId, status: "active" },
        });
        return enrollment;
      })
    );

    res.status(201).json({ message: "Students enrolled successfully", enrollments });
  } catch (error) {
    console.error("Error enrolling students:", error);
    res.status(500).json({ error: "Failed to enroll students" });
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
