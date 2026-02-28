const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // references a subdocument in Quiz.questions
  },
  // For MCQ: selected option index(es)
  selectedOptions: [Number],
  // For short_answer / code
  textAnswer: {
    type: String,
    default: null,
  },
  // For code questions
  codeAnswer: {
    type: String,
    default: null,
  },
  language: {
    type: String,
    default: null,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  pointsEarned: {
    type: Number,
    default: 0,
  },
  // AI-generated feedback for this specific answer
  aiFeedback: {
    type: String,
    default: null,
  },
  // Time spent on this question (seconds)
  timeSpent: {
    type: Number,
    default: 0,
  },
});

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz reference is required"],
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student reference is required"],
    },
    answers: [answerSchema],
    // Scores
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    // Timing
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Duration in seconds
    duration: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "timed_out", "abandoned"],
      default: "in_progress",
    },
    attemptNumber: {
      type: Number,
      default: 1,
    },
    // Overall AI feedback for the attempt
    aiFeedback: {
      type: String,
      default: null,
    },
    // Difficulty level exhibited during this attempt (for adaptive quizzes)
    difficultyReached: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({ quiz: 1, student: 1 });
quizAttemptSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
