const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    required: true,
  },
  content: {
    type: String,
    required: [true, "Message content is required"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Metadata about AI response
  metadata: {
    model: { type: String, default: null },
    tokensUsed: { type: Number, default: null },
    responseTime: { type: Number, default: null }, // ms
  },
});

const conversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    // Context: what the conversation is about
    context: {
      type: String,
      enum: [
        "course_explanation", // AI explaining course content
        "exercise_help", // Help with exercises
        "code_assistance", // Help with code in editor
        "error_explanation", // Explaining errors
        "general", // General educational questions
      ],
      default: "general",
    },
    // Optional references to provide context to the AI
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
    codeSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodeSession",
      default: null,
    },
    title: {
      type: String,
      default: "New Conversation",
      trim: true,
      maxlength: 200,
    },
    messages: [messageSchema],
    // Is the conversation still active
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: message count
conversationSchema.virtual("messageCount").get(function () {
  return this.messages ? this.messages.length : 0;
});

conversationSchema.index({ user: 1, isActive: 1 });
conversationSchema.index({ course: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
