const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    // What kind of activity
    type: {
      type: String,
      enum: [
        "course_access", // Accessed a course/module
        "resource_view", // Viewed a resource
        "quiz_start", // Started a quiz
        "quiz_complete", // Completed a quiz
        "code_session_start", // Started coding
        "code_session_end", // Ended coding session
        "code_run", // Ran code
        "code_error", // Encountered error
        "supervision_join", // Joined supervision session
        "supervision_leave", // Left supervision session
        "chat_message", // Sent a chatbot message
        "login", // User logged in
        "logout", // User logged out
      ],
      required: true,
    },
    // References (contextual, depending on type)
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
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
    codeSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodeSession",
      default: null,
    },
    supervisionSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupervisionSession",
      default: null,
    },
    // Duration of the activity in seconds (where applicable)
    duration: {
      type: Number,
      default: null,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // IP address (for security logging)
    ipAddress: {
      type: String,
      default: null,
    },
    // User agent
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for dashboard analytics queries
activityLogSchema.index({ user: 1, type: 1, createdAt: -1 });
activityLogSchema.index({ course: 1, createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
