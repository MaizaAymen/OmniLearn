const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * CodeSession - Persists a student's Web Code Editor session.
 * Linked to a course; optionally to a specific module/resource.
 */
const CodeSession = sequelize.define(
  "CodeSession",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "courses", key: "id" },
      onDelete: "SET NULL",
    },
    // Programming language selected in the editor
    language: {
      type: DataTypes.ENUM("python", "java", "c", "javascript", "typescript", "other"),
      defaultValue: "python",
    },
    // Full code content (auto-saved)
    code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Last execution output
    lastOutput: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Cumulative error count in this session
    errorCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Number of inactivity alerts triggered
    inactivityAlerts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Session duration in seconds
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Has the teacher been alerted about repeated errors?
    teacherAlertSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    savedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM("active", "paused", "completed"),
      defaultValue: "active",
    },
  },
  {
    tableName: "code_sessions",
    timestamps: true,
  }
);

module.exports = CodeSession;
