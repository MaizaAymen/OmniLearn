const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["teacher", "student"],
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: {
    type: Date,
    default: null,
  },
  // WebRTC connection state
  connectionState: {
    type: String,
    enum: ["connecting", "connected", "disconnected"],
    default: "connecting",
  },
  // Is microphone active
  isMicActive: {
    type: Boolean,
    default: false,
  },
  // Is screen sharing active
  isScreenSharing: {
    type: Boolean,
    default: false,
  },
});

const supervisionSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Session title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher is required"],
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    participants: [participantSchema],
    // Session type
    type: {
      type: String,
      enum: ["live_coding", "lecture", "lab", "exam"],
      default: "lab",
    },
    // Session status
    status: {
      type: String,
      enum: ["scheduled", "active", "paused", "completed", "cancelled"],
      default: "scheduled",
    },
    // Scheduling
    scheduledStart: {
      type: Date,
      default: null,
    },
    scheduledEnd: {
      type: Date,
      default: null,
    },
    actualStart: {
      type: Date,
      default: null,
    },
    actualEnd: {
      type: Date,
      default: null,
    },
    // WebRTC room identifier
    roomId: {
      type: String,
      unique: true,
      required: true,
    },
    // Linked code sessions (students' work during this supervision)
    codeSessions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CodeSession",
      },
    ],
    // Recording URL (optional)
    recordingUrl: {
      type: String,
      default: null,
    },
    // Settings
    settings: {
      allowVoiceChat: { type: Boolean, default: true },
      allowScreenShare: { type: Boolean, default: true },
      monitorStudentActivity: { type: Boolean, default: true },
      autoAlertOnInactivity: { type: Boolean, default: true },
      inactivityThreshold: { type: Number, default: 300 }, // seconds
      autoAlertOnRepeatedErrors: { type: Boolean, default: true },
      repeatedErrorThreshold: { type: Number, default: 3 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: active participant count
supervisionSessionSchema.virtual("activeParticipantCount").get(function () {
  return this.participants
    ? this.participants.filter((p) => p.connectionState === "connected").length
    : 0;
});

supervisionSessionSchema.index({ teacher: 1, status: 1 });
supervisionSessionSchema.index({ class: 1 });
supervisionSessionSchema.index({ roomId: 1 });

module.exports = mongoose.model("SupervisionSession", supervisionSessionSchema);
