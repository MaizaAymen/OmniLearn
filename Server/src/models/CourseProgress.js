const mongoose = require("mongoose");

const courseProgressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    // Track per-module completion
    moduleProgress: [
      {
        module: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Module",
          required: true,
        },
        status: {
          type: String,
          enum: ["not_started", "in_progress", "completed"],
          default: "not_started",
        },
        // Percentage of module content accessed
        completionPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        // Time spent on this module (seconds)
        timeSpent: {
          type: Number,
          default: 0,
        },
        lastAccessedAt: {
          type: Date,
          default: null,
        },
        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    // Track accessed resources
    resourcesAccessed: [
      {
        resource: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Resource",
        },
        accessedAt: {
          type: Date,
          default: Date.now,
        },
        timeSpent: {
          type: Number,
          default: 0, // seconds
        },
      },
    ],
    // Overall course progress
    overallProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Total time spent on this course (seconds)
    totalTimeSpent: {
      type: Number,
      default: 0,
    },
    // Course-level quiz average
    averageQuizScore: {
      type: Number,
      default: null,
    },
    // First and last access
    firstAccessedAt: {
      type: Date,
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    // Completion
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one progress record per student-course pair
courseProgressSchema.index({ student: 1, course: 1 }, { unique: true });
courseProgressSchema.index({ course: 1 });

module.exports = mongoose.model("CourseProgress", courseProgressSchema);
