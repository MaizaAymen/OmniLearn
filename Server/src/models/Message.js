const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "conversations", key: "id" },
      onDelete: "CASCADE",
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    // Optional file/gif/code attachment.
    // Shape: { url, name, mime, size, kind } where kind is "image" | "file".
    attachment: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "messages",
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = Message;
