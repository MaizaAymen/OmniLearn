const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const StudentProblemSet = sequelize.define(
  "StudentProblemSet",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    studentId: { type: DataTypes.UUID, allowNull: false },
    problemId: { type: DataTypes.STRING, allowNull: false, defaultValue: "unknown" },
    status: {
      type: DataTypes.ENUM("attempted", "solved"),
      defaultValue: "attempted",
    },
    bestScore: { type: DataTypes.FLOAT, defaultValue: 0 },
    attempts: { type: DataTypes.INTEGER, defaultValue: 1 },
    lastAttemptAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "student_problem_sets",
    timestamps: true,
    indexes: [{ unique: true, fields: ["studentId", "problemId"] }],
  }
);

module.exports = StudentProblemSet;
