const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Quiz = sequelize.define(
  "Quiz",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    moduleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "modules", key: "id" },
      onDelete: "CASCADE",
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "courses", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Time limit in minutes (null = unlimited)
    timeLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    passingScore: {
      type: DataTypes.FLOAT,
      defaultValue: 50.0,
    },
    // AI-adaptive quiz adjusts difficulty per student
    isAdaptive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Difficulty targeting
    targetLevel: {
      type: DataTypes.ENUM("beginner", "intermediate", "advanced", "all"),
      defaultValue: "all",
    },
  },
  {
    tableName: "quizzes",
    timestamps: true,
  }
);

module.exports = Quiz;
