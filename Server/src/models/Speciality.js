const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Speciality = sequelize.define(
  "Speciality",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    gradeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "grades", key: "id" },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false, // e.g., "Web Development", "AI", "Cybersecurity"
    },
    displayName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true, // Icon identifier for UI
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
    tableName: "specialities",
    timestamps: true,
  }
);

module.exports = Speciality;
