const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
    },
    // Who/what triggered the notification
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null = system-generated
    },
    type: {
      type: String,
      enum: [
        "student_inactivity", // Student inactive during session
        "repeated_errors", // Student has repeated errors in code
        "quiz_submitted", // Student submitted a quiz
        "new_course", // New course assigned to class
        "new_quiz", // New quiz available
        "session_starting", // Supervision session about to start
        "failure_risk", // AI detected failure risk
        "level_change", // Student level changed
        "new_recommendation", // AI generated new recommendation
        "system", // General system notification
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
    },
    // Contextual references
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    supervisionSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupervisionSession",
      default: null,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // the student this notification is about (for teacher alerts)
    },
    // Notification state
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
