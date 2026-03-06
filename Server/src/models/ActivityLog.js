const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * ActivityLog - Records every significant user action for the analytics dashboard.
 */
const ActivityLog = sequelize.define(
  "ActivityLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    // e.g. "course_view", "quiz_start", "quiz_submit", "code_run", "resource_download", "login", "chat_message"
    activityType: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    // Optional reference to a course
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "courses", key: "id" },
      onDelete: "SET NULL",
    },
    // Arbitrary payload (e.g. { language: "python", errors: 3 })
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Time spent on this activity in seconds
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "activity_logs",
    timestamps: true,
    // Only createdAt is relevant; no updatedAt needed
    updatedAt: false,
  }
);

module.exports = ActivityLog;
