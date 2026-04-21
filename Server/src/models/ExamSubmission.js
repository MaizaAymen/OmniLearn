const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// One row per student, per exam session. Immutable snapshot taken at timeout.
const ExamSubmission = sequelize.define(
  "ExamSubmission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Which session this exam ran in (e.g. "S-AB12CD")
    sessionId:   { type: DataTypes.STRING,  allowNull: false },
    problemId:   { type: DataTypes.STRING,  allowNull: true },

    // Who submitted (socketId is a display anchor; userId if logged in)
    studentSocketId: { type: DataTypes.STRING, allowNull: false },
    studentName:     { type: DataTypes.STRING, allowNull: false },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },

    // What they wrote
    code:     { type: DataTypes.TEXT,   allowNull: true  },
    language: { type: DataTypes.STRING, allowNull: true  },

    // Status at snapshot time
    finalStatus: {
      type: DataTypes.ENUM("submitted", "timed-out", "abandoned"),
      defaultValue: "timed-out",
    },

    durationSeconds: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: "exam_submissions", timestamps: true }
);

module.exports = ExamSubmission;
