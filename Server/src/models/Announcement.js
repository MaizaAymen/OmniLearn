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
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "classes", key: "id" },
      onDelete: "CASCADE",
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
