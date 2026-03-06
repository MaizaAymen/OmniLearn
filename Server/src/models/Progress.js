const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Progress - Tracks a student's progress through a specific course.
 * Updated every time the student accesses course content.
 */
const Progress = sequelize.define(
  "Progress",
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
      allowNull: false,
      references: { model: "courses", key: "id" },
      onDelete: "CASCADE",
    },
    // Percentage 0–100
    completionPercentage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    // Total time spent in seconds
    timeSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // AI-determined level for this course context
    currentLevel: {
      type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
      defaultValue: "beginner",
    },
    // AI-recommended next module/resource id
    nextRecommendation: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // IDs of completed modules stored as JSON array
    completedModules: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    tableName: "progress",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["studentId", "courseId"],
      },
    ],
  }
);

module.exports = Progress;
