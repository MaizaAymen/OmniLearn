const mongoose = require("mongoose");

const codeSnapshotSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Event that triggered the save
  trigger: {
    type: String,
    enum: ["auto_save", "manual_save", "run", "error", "submit"],
    default: "auto_save",
  },
});

const errorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String, // "syntax", "runtime", "logic"
    default: "runtime",
  },
  line: {
    type: Number,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Count of consecutive similar errors (for repeated error detection)
  repeatCount: {
    type: Number,
    default: 1,
  },
});

const codeSessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    // Optional link to a course/module exercise
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
    // Optional link to a supervision session
    supervisionSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupervisionSession",
      default: null,
    },
    // Programming language
    language: {
      type: String,
      enum: ["python", "java", "c", "javascript"],
      required: [true, "Language is required"],
    },
    // Current code state
    currentCode: {
      type: String,
      default: "",
    },
    // Automatic session snapshots
    snapshots: [codeSnapshotSchema],
    // Error logs for detection of repeated errors
    errors: [errorLogSchema],
    // Session timing
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    // Total active editing time in seconds
    activeTime: {
      type: Number,
      default: 0,
    },
    // Total idle time in seconds
    idleTime: {
      type: Number,
      default: 0,
    },
    // Number of code runs
    runCount: {
      type: Number,
      default: 0,
    },
    // Number of errors encountered
    errorCount: {
      type: Number,
      default: 0,
    },
    // Number of repeated errors (threshold-based alert)
    repeatedErrorCount: {
      type: Number,
      default: 0,
    },
    // Inactivity detected
    inactivityDetected: {
      type: Boolean,
      default: false,
    },
    // Last output from code execution
    lastOutput: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "idle", "completed", "abandoned"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

codeSessionSchema.index({ student: 1, status: 1 });
codeSessionSchema.index({ supervisionSession: 1 });
codeSessionSchema.index({ course: 1, module: 1 });

module.exports = mongoose.model("CodeSession", codeSessionSchema);
