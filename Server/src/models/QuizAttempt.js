const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const QuizAttempt = sequelize.define(
  "QuizAttempt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quizId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "quizzes", key: "id" },
      onDelete: "CASCADE",
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    startedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    score: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    maxScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    percentage: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    isPassed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // AI-generated overall feedback for this attempt
    aiFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("in_progress", "completed", "abandoned"),
      defaultValue: "in_progress",
    },
  },
  {
    tableName: "quiz_attempts",
    timestamps: true,
  }
);

module.exports = QuizAttempt;
