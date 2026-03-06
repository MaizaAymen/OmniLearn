const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Profile = sequelize.define(
  "Profile",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Adaptive learning level (AI-assigned)
    level: {
      type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
      defaultValue: "beginner",
    },
    // Aggregated analytics scores
    engagementScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    productivityScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    failureRisk: {
      type: DataTypes.ENUM("low", "medium", "high"),
      defaultValue: "low",
    },
  },
  {
    tableName: "profiles",
    timestamps: true,
  }
);

module.exports = Profile;
