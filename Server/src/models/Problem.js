const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Problem = sequelize.define(
    'Problem', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    examples: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    constraints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    hints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    starterCode: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    expectedOutput: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    roadmap: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('draft', 'review', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'published',
    },
    scope: {
      type: DataTypes.ENUM('global', 'module', 'institution', 'class'),
      allowNull: false,
      defaultValue: 'global',
    },
    // ── INSTITUTION ────────────────────────────────────────────────────────
    // Si non null, ce problème est privé à une institution.
    // Visible uniquement par les membres (étudiants/profs) de cette institution
    // et par leur institution_admin.
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    // ── CLASSROOM ──────────────────────────────────────────────────────────
    // Si non null, ce problème est privé à une classe précise. Visible
    // uniquement dans cette classe (par le prof qui la possède et ses élèves).
    classId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    forkedFrom: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    testCasesValidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    moduleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    // ── PLAN GRATUIT ───────────────────────────────────────────────────────
    // Si TRUE, ce problème est visible aux utilisateurs "free".
    // Seul l'admin coche cette case. On en garde ~10 max pour le plan gratuit.
    isFreeTier: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // ── PLAN PRO ───────────────────────────────────────────────────────────
    // Si TRUE, ce problème est visible aux utilisateurs "pro" (et institution).
    // Géré par l'admin dans le Pro Tier Manager.
    isProTier: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    timestamps: true,
  });

module.exports = Problem;