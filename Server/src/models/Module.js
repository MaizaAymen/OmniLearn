const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Module title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    // Content body (rich text / markdown for AI explanations)
    content: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    // Attached resources
    resources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Resource",
      },
    ],
    // Linked quizzes for this module
    quizzes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
      },
    ],
    // Difficulty for adaptive learning
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    // Estimated duration in minutes
    estimatedDuration: {
      type: Number,
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

moduleSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model("Module", moduleSchema);
