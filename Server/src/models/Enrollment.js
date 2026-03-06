const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Enrollment - many-to-many bridge between students and classes.
 */
const Enrollment = sequelize.define(
  "Enrollment",
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
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    enrolledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM("active", "suspended", "completed"),
      defaultValue: "active",
    },
  },
  {
    tableName: "enrollments",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["classId", "studentId"],
      },
    ],
  }
);

module.exports = Enrollment;
