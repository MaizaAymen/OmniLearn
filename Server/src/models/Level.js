const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Level = sequelize.define(
  "Level",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    specialityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "specialities", key: "id" },
      onDelete: "CASCADE",
    },
    // Mirrors the parent speciality/grade institutionId for direct filtering.
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false, // e.g., "Level 1", "Level 2", "Beginner"
    },
    displayName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "levels",
    timestamps: true,
  }
);

module.exports = Level;
