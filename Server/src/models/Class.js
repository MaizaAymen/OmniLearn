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
      allowNull: false,
      references: { model: "users", key: "id" },
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
  },
  {
    tableName: "classes",
    timestamps: true,
  }
);

module.exports = Class;
