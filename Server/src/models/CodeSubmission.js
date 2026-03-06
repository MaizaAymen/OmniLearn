const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * CodeSubmission - Stores every code submission made by a student.
 *
 * Keeps three distinct code blocks per row:
 *   • userCode    – what the student wrote and submitted
 *   • solution    – the official reference solution (teacher-authored)
 *   • starterCode – the boilerplate/skeleton provided to the student (optional)
 *
 * You can add more fields later without changing anything else.
 */
const CodeSubmission = sequelize.define(
  "CodeSubmission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ── Who submitted ────────────────────────────────────────────────────────
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },

    // ── Context (both optional – allows standalone exercises) ─────────────
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "courses", key: "id" },
      onDelete: "SET NULL",
    },
    moduleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "modules", key: "id" },
      onDelete: "SET NULL",
    },

    // ── Exercise identification ───────────────────────────────────────────
    // Free-form title / slug (e.g. "fibonacci", "bubble-sort")
    exerciseTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Full problem statement (Markdown supported)
    problemStatement: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ── Code blocks ──────────────────────────────────────────────────────
    // The code the student wrote and submitted
    userCode: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // The official teacher / system reference solution
    solution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Boilerplate / starter template shown to the student before they start
    starterCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ── Language & runtime ────────────────────────────────────────────────
    language: {
      type: DataTypes.ENUM(
        "python",
        "java",
        "c",
        "javascript",
        "typescript",
        "other"
      ),
      allowNull: false,
      defaultValue: "python",
    },

    // ── Execution results ─────────────────────────────────────────────────
    // "pending" → queued for execution
    // "running" → currently executing
    // "passed"  → all tests green
    // "failed"  → at least one test red
    // "error"   → compilation / runtime error
    status: {
      type: DataTypes.ENUM("pending", "running", "passed", "failed", "error"),
      defaultValue: "pending",
    },
    // stdout / stderr from the code runner
    output: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Structured test-case results:
    // [{ name, passed, expected, actual, error? }, ...]
    testResults: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    // Number of tests that passed
    testsPassed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Total number of tests run
    testsTotal: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Execution time in milliseconds
    executionTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Peak memory usage in KB
    memoryUsedKb: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // ── Scoring ───────────────────────────────────────────────────────────
    score: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    maxScore: {
      type: DataTypes.FLOAT,
      defaultValue: 100,
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // ── Attempt tracking ──────────────────────────────────────────────────
    attemptNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    // ── AI feedback ───────────────────────────────────────────────────────
    // AI-generated explanation of errors or improvements
    aiExplanation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // AI hints shown to the student before submission (array of strings)
    aiHints: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    tableName: "code_submissions",
    timestamps: true, // createdAt = submission time, updatedAt = last judge update
  }
);

module.exports = CodeSubmission;
