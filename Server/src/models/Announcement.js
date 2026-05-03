const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Announcement = sequelize.define(
  "Announcement",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    classId: {
      // null = annonce institution-wide (pas liée à une classe précise)
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "classes", key: "id" },
      onDelete: "CASCADE",
    },
    institutionId: {
      // Présent pour les annonces institution-wide.
      type: DataTypes.UUID,
      allowNull: true,
    },
    targetRole: {
      // "all" | "students" | "teachers" — pour cibler une audience.
      type: DataTypes.ENUM("all", "students", "teachers"),
      allowNull: false,
      defaultValue: "all",
    },
    pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "announcements",
    timestamps: true,
  }
);

module.exports = Announcement;
