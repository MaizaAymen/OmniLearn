const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Class = sequelize.define(
  "Class",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    gradeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "grades", key: "id" },
      onDelete: "SET NULL",
    },
    specialityId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "specialities", key: "id" },
      onDelete: "SET NULL",
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "levels", key: "id" },
      onDelete: "SET NULL",
    },
    academicYear: {
      type: DataTypes.STRING(20),
      allowNull: true, // e.g. "2025-2026"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    inviteCode: {
      type: DataTypes.STRING(8),
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: "classes",
    timestamps: true,
  }
);

module.exports = Class;
