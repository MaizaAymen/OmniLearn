const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * ChatMessage - Stores a conversation thread between a student and the AI chatbot,
 * scoped optionally to a course.
 */
const ChatMessage = sequelize.define(
  "ChatMessage",
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
    // Optional course context for the chatbot
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "courses", key: "id" },
      onDelete: "SET NULL",
    },
    // "user" = student message, "assistant" = AI response
    role: {
      type: DataTypes.ENUM("user", "assistant"),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Optional: code snippet attached to the message
    codeSnippet: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Language of the code snippet (if any)
    codeLanguage: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Token usage metadata from AI provider (for billing/logging)
    tokenUsage: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "chat_messages",
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = ChatMessage;
