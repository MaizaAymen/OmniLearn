const mongoose = require("mongoose");

const skillAssessmentSchema = new mongoose.Schema({
  skill: {
    type: String,
    required: true, // e.g. "loops", "functions", "OOP", "SQL"
  },
  level: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  assessedAt: {
    type: Date,
    default: Date.now,
  },
});

const learningPathItemSchema = new mongoose.Schema({
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    default: null,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["module", "quiz", "exercise", "review"],
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "skipped"],
    default: "pending",
  },
  completedAt: {
    type: Date,
    default: null,
  },
  order: {
    type: Number,
    default: 0,
  },
});

const studentProfileSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
      unique: true,
    },
    // --- AI Classification ---
    overallLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    // Per-skill assessments
    skillAssessments: [skillAssessmentSchema],
    // --- Engagement Metrics (for teacher dashboard) ---
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    productivityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // --- Failure Risk Prediction ---
    failureRisk: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    failureRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // --- Progress Stats ---
    totalCoursesAccessed: {
      type: Number,
      default: 0,
    },
    totalQuizzesCompleted: {
      type: Number,
      default: 0,
    },
    averageQuizScore: {
      type: Number,
      default: 0,
    },
    totalCodeSessions: {
      type: Number,
      default: 0,
    },
    totalCodingTime: {
      type: Number,
      default: 0, // seconds
    },
    totalActiveTime: {
      type: Number,
      default: 0, // seconds across all activities
    },
    // --- Personalized Learning Path ---
    learningPath: [learningPathItemSchema],
    // --- AI Recommendations ---
    recommendations: [
      {
        type: {
          type: String,
          enum: [
            "review_module",
            "practice_exercise",
            "take_quiz",
            "study_concept",
          ],
        },
        title: { type: String },
        description: { type: String },
        priority: {
          type: String,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
        relatedCourse: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          default: null,
        },
        relatedModule: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Module",
          default: null,
        },
        isCompleted: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // --- Activity Heatmap Data ---
    // Stores daily activity counts { date: "2026-02-28", count: 15 }
    activityHeatmap: [
      {
        date: { type: String }, // "YYYY-MM-DD"
        count: { type: Number, default: 0 },
      },
    ],
    // --- Strengths & Weaknesses (AI-analyzed) ---
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    // Last time the AI profile was recalculated
    lastAnalyzedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

studentProfileSchema.index({ student: 1 });
studentProfileSchema.index({ overallLevel: 1 });
studentProfileSchema.index({ failureRisk: 1 });

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
