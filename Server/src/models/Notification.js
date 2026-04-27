const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Notification - In-app notifications for all roles.
 * e.g. teacher alert on student inactivity, grade available, new course assigned.
 */
const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // e.g. "info", "warning", "alert", "success", "message", "invite"
    type: {
      type: DataTypes.STRING(32),
      defaultValue: "info",
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Optional deep-link metadata
    link: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // Free-form payload — used by invites to carry conversationId.
    data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = Notification;
