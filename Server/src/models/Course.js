const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Course = sequelize.define(
  "Course",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
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
      onDelete: "CASCADE",
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "classes", key: "id" },
      onDelete: "SET NULL",
    },
    subject: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM("beginner", "intermediate", "advanced"),
      defaultValue: "beginner",
    },
    thumbnail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Time estimate in minutes
    estimatedDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "courses",
    timestamps: true,
  }
);

module.exports = Course;
