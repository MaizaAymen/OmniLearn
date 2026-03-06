const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Question = sequelize.define(
  "Question",
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
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "multiple_choice",
        "true_false",
        "short_answer",
        "code"
      ),
      allowNull: false,
      defaultValue: "multiple_choice",
    },
    // For multiple_choice: array of strings; stored as JSON
    options: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Correct answer(s): string or array stored as JSON
    correctAnswer: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    points: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    difficulty: {
      type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
      defaultValue: "beginner",
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // AI-generated flag
    isAiGenerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "questions",
    timestamps: true,
  }
);

module.exports = Question;
