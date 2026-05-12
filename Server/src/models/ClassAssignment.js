const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ClassAssignment = sequelize.define(
  "ClassAssignment",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    moduleId: { type: DataTypes.UUID, allowNull: true },
    classId: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    problemIds: { type: DataTypes.JSONB, defaultValue: [] },
    dueDate: { type: DataTypes.DATE, allowNull: true },
    maxAttempts: { type: DataTypes.INTEGER, allowNull: true },
    isPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
    language: { type: DataTypes.STRING(30), allowNull: true }, // locked language, null = any
  },
  { tableName: "class_assignments", timestamps: true }
);

module.exports = ClassAssignment;
