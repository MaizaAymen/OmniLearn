const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Answer = sequelize.define(
  "Answer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    attemptId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "quiz_attempts", key: "id" },
      onDelete: "CASCADE",
    },
    questionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "questions", key: "id" },
      onDelete: "CASCADE",
    },
    // Student's answer: could be string, index, or array — stored as JSON
    studentAnswer: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    pointsEarned: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    // AI-generated per-answer explanation / tip
    aiFeedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "answers",
    timestamps: true,
  }
);

module.exports = Answer;
