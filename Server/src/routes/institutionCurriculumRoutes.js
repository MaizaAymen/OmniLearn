// ─────────────────────────────────────────────────────────────────────────────
// PER-INSTITUTION CURRICULUM (Grades / Specialities / Levels)
// Each institution owns its own list. The institution_admin manages it from
// the "My Institution" → Curriculum tab. Super admin can manage any.
// All endpoints are scoped under /:institutionId/* and authorize the caller
// against that exact institution.
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Grade, Speciality, Level } = require("../models");
const { authenticate, requireInstitutionAdmin } = require("../middleware/Authmiddleware");

router.use(authenticate);
router.use(requireInstitutionAdmin);

// Verify the caller is acting on their own institution (super admin bypasses).
// Uses router.param so it fires for every route that captures :institutionId,
// without relying on path-to-regexp wildcard syntax.
router.param("institutionId", (req, res, next, institutionId) => {
  if (req.user.role === "admin") return next();
  if (req.user.institutionId === institutionId) return next();
  return res.status(403).json({ error: "Forbidden" });
});

// ─── GRADES ──────────────────────────────────────────────────────────────────
router.get("/:institutionId/grades", async (req, res) => {
  try {
    const grades = await Grade.findAll({
      where: { institutionId: req.params.institutionId },
      order: [["order", "ASC"], ["createdAt", "ASC"]],
    });
    res.json(grades);
  } catch (err) {
    console.error("list institution grades:", err);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

router.post("/:institutionId/grades", async (req, res) => {
  try {
    const { name, displayName, description, order, isActive } = req.body;
    if (!name || !displayName) {
      return res.status(400).json({ error: "name and displayName are required" });
    }
    const exists = await Grade.findOne({
      where: { institutionId: req.params.institutionId, name },
    });
    if (exists) return res.status(400).json({ error: "Grade name already exists in this institution" });

    const grade = await Grade.create({
      institutionId: req.params.institutionId,
      name,
      displayName,
      description,
      order: order || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(grade);
  } catch (err) {
    console.error("create institution grade:", err);
    res.status(500).json({ error: "Failed to create grade" });
  }
});

router.put("/:institutionId/grades/:id", async (req, res) => {
  try {
    const grade = await Grade.findOne({
      where: { id: req.params.id, institutionId: req.params.institutionId },
    });
    if (!grade) return res.status(404).json({ error: "Grade not found" });

    const { name, displayName, description, order, isActive } = req.body;
    await grade.update({
      name: name ?? grade.name,
      displayName: displayName ?? grade.displayName,
      description: description ?? grade.description,
      order: order ?? grade.order,
      isActive: isActive ?? grade.isActive,
    });
    res.json(grade);
  } catch (err) {
    console.error("update institution grade:", err);
    res.status(500).json({ error: "Failed to update grade" });
  }
});

router.delete("/:institutionId/grades/:id", async (req, res) => {
  try {
    const grade = await Grade.findOne({
      where: { id: req.params.id, institutionId: req.params.institutionId },
    });
    if (!grade) return res.status(404).json({ error: "Grade not found" });
    await grade.destroy();
    res.json({ message: "Grade deleted" });
  } catch (err) {
    console.error("delete institution grade:", err);
    res.status(500).json({ error: "Failed to delete grade" });
  }
});

// ─── SPECIALITIES ────────────────────────────────────────────────────────────
router.get("/:institutionId/specialities", async (req, res) => {
  try {
    const where = { institutionId: req.params.institutionId };
    if (req.query.gradeId) where.gradeId = req.query.gradeId;
    const specialities = await Speciality.findAll({
      where,
      include: [{ model: Grade, as: "grade", attributes: ["id", "name", "displayName"] }],
      order: [["order", "ASC"], ["createdAt", "ASC"]],
    });
    res.json(specialities);
  } catch (err) {
    console.error("list institution specialities:", err);
    res.status(500).json({ error: "Failed to fetch specialities" });
  }
});

router.post("/:institutionId/specialities", async (req, res) => {
  try {
    const { gradeId, name, displayName, description, icon, order, isActive } = req.body;
    if (!gradeId || !name || !displayName) {
      return res.status(400).json({ error: "gradeId, name and displayName are required" });
    }
    // Grade must belong to this institution.
    const grade = await Grade.findOne({
      where: { id: gradeId, institutionId: req.params.institutionId },
    });
    if (!grade) return res.status(400).json({ error: "Grade does not belong to this institution" });

    const speciality = await Speciality.create({
      institutionId: req.params.institutionId,
      gradeId,
      name,
      displayName,
      description,
      icon,
      order: order || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(speciality);
  } catch (err) {
    console.error("create institution speciality:", err);
    res.status(500).json({ error: "Failed to create speciality" });
  }
});

router.put("/:institutionId/specialities/:id", async (req, res) => {
  try {
    const speciality = await Speciality.findOne({
      where: { id: req.params.id, institutionId: req.params.institutionId },
    });
    if (!speciality) return res.status(404).json({ error: "Speciality not found" });

    const { gradeId, name, displayName, description, icon, order, isActive } = req.body;
    if (gradeId && gradeId !== speciality.gradeId) {
      const grade = await Grade.findOne({
        where: { id: gradeId, institutionId: req.params.institutionId },
      });
      if (!grade) return res.status(400).json({ error: "Grade does not belong to this institution" });
    }
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
  } catch (err) {
    console.error("update institution speciality:", err);
    res.status(500).json({ error: "Failed to update speciality" });
  }
});

router.delete("/:institutionId/specialities/:id", async (req, res) => {
  try {
    const speciality = await Speciality.findOne({
      where: { id: req.params.id, institutionId: req.params.institutionId },
    });
    if (!speciality) return res.status(404).json({ error: "Speciality not found" });
    await speciality.destroy();
    res.json({ message: "Speciality deleted" });
  } catch (err) {
    console.error("delete institution speciality:", err);
    res.status(500).json({ error: "Failed to delete speciality" });
  }
});

// ─── LEVELS ──────────────────────────────────────────────────────────────────
router.get("/:institutionId/levels", async (req, res) => {
  try {
    const where = { institutionId: req.params.institutionId };
    if (req.query.specialityId) where.specialityId = req.query.specialityId;
    const levels = await Level.findAll({
      where,
      include: [
        {
          model: Speciality, as: "speciality",
          attributes: ["id", "name", "displayName", "gradeId"],
          include: [{ model: Grade, as: "grade", attributes: ["id", "name", "displayName"] }],
        },
      ],
      order: [["order", "ASC"], ["createdAt", "ASC"]],
    });
    res.json(levels);
  } catch (err) {
    console.error("list institution levels:", err);
    res.status(500).json({ error: "Failed to fetch levels" });
  }
});

router.post("/:institutionId/levels", async (req, res) => {
  try {
    const { specialityId, name, displayName, description, order, isActive } = req.body;
    if (!specialityId || !name || !displayName) {
      return res.status(400).json({ error: "specialityId, name and displayName are required" });
    }
    const speciality = await Speciality.findOne({
      where: { id: specialityId, institutionId: req.params.institutionId },
    });
    if (!speciality) return res.status(400).json({ error: "Speciality does not belong to this institution" });

    const level = await Level.create({
      institutionId: req.params.institutionId,
      specialityId,
      name,
      displayName,
      description,
      order: order || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(level);
  } catch (err) {
    console.error("create institution level:", err);
    res.status(500).json({ error: "Failed to create level" });
  }
});

router.put("/:institutionId/levels/:id", async (req, res) => {
  try {
    const level = await Level.findOne({
      where: { id: req.params.id, institutionId: req.params.institutionId },
    });
    if (!level) return res.status(404).json({ error: "Level not found" });

    const { specialityId, name, displayName, description, order, isActive } = req.body;
    if (specialityId && specialityId !== level.specialityId) {
      const speciality = await Speciality.findOne({
        where: { id: specialityId, institutionId: req.params.institutionId },
      });
      if (!speciality) return res.status(400).json({ error: "Speciality does not belong to this institution" });
    }
    await level.update({
      specialityId: specialityId ?? level.specialityId,
      name: name ?? level.name,
      displayName: displayName ?? level.displayName,
      description: description ?? level.description,
      order: order ?? level.order,
      isActive: isActive ?? level.isActive,
    });
    res.json(level);
  } catch (err) {
    console.error("update institution level:", err);
    res.status(500).json({ error: "Failed to update level" });
  }
});

router.delete("/:institutionId/levels/:id", async (req, res) => {
  try {
    const level = await Level.findOne({
      where: { id: req.params.id, institutionId: req.params.institutionId },
    });
    if (!level) return res.status(404).json({ error: "Level not found" });
    await level.destroy();
    res.json({ message: "Level deleted" });
  } catch (err) {
    console.error("delete institution level:", err);
    res.status(500).json({ error: "Failed to delete level" });
  }
});

// ─── SEED FROM GLOBAL TEMPLATES ──────────────────────────────────────────────
// Clones every grade/speciality/level whose institutionId is null into this
// institution. Skips entries whose name already exists in the institution.
router.post("/:institutionId/seed-from-defaults", async (req, res) => {
  try {
    const institutionId = req.params.institutionId;

    const globalGrades = await Grade.findAll({ where: { institutionId: null } });
    const existingGrades = await Grade.findAll({ where: { institutionId } });
    const existingGradeNames = new Set(existingGrades.map((g) => g.name));

    const gradeIdMap = new Map(); // global id → new institution grade id
    let createdGrades = 0;

    for (const g of globalGrades) {
      if (existingGradeNames.has(g.name)) continue;
      const created = await Grade.create({
        institutionId,
        name: g.name,
        displayName: g.displayName,
        description: g.description,
        order: g.order,
        isActive: g.isActive,
      });
      gradeIdMap.set(g.id, created.id);
      createdGrades++;
    }

    const globalSpecialities = await Speciality.findAll({
      where: { institutionId: null, gradeId: { [Op.in]: globalGrades.map((g) => g.id) } },
    });
    const specialityIdMap = new Map();
    let createdSpecialities = 0;

    for (const s of globalSpecialities) {
      const newGradeId = gradeIdMap.get(s.gradeId);
      if (!newGradeId) continue; // grade was skipped (already existed)
      const created = await Speciality.create({
        institutionId,
        gradeId: newGradeId,
        name: s.name,
        displayName: s.displayName,
        description: s.description,
        icon: s.icon,
        order: s.order,
        isActive: s.isActive,
      });
      specialityIdMap.set(s.id, created.id);
      createdSpecialities++;
    }

    const globalLevels = await Level.findAll({
      where: { institutionId: null, specialityId: { [Op.in]: globalSpecialities.map((s) => s.id) } },
    });
    let createdLevels = 0;

    for (const lv of globalLevels) {
      const newSpecialityId = specialityIdMap.get(lv.specialityId);
      if (!newSpecialityId) continue;
      await Level.create({
        institutionId,
        specialityId: newSpecialityId,
        name: lv.name,
        displayName: lv.displayName,
        description: lv.description,
        order: lv.order,
        isActive: lv.isActive,
      });
      createdLevels++;
    }

    res.json({
      message: "Seeded from global defaults",
      createdGrades,
      createdSpecialities,
      createdLevels,
    });
  } catch (err) {
    console.error("seed institution curriculum:", err);
    res.status(500).json({ error: "Failed to seed curriculum" });
  }
});

module.exports = router;
