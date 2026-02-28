const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, "Question text is required"],
  },
  type: {
    type: String,
    enum: ["mcq", "true_false", "short_answer", "code"],
    required: true,
  },
  // For MCQ
  options: [
    {
      text: { type: String, required: true },
      isCorrect: { type: Boolean, default: false },
    },
  ],
  // For short answer / code
  correctAnswer: {
    type: String,
    default: null,
  },
  // For code questions
  language: {
    type: String,
    default: null,
  },
  testCases: [
    {
      input: { type: String },
      expectedOutput: { type: String },
    },
  ],
  explanation: {
    type: String,
    default: "", // AI-generated explanation for feedback
  },
  points: {
    type: Number,
    default: 1,
  },
  difficulty: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
  },
  // Was this question AI-generated?
  isAIGenerated: {
    type: Boolean,
    default: false,
  },
});

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Quiz title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      default: null,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questions: [questionSchema],
    // Quiz settings
    duration: {
      type: Number, // in minutes
      default: null, // null = unlimited
    },
    maxAttempts: {
      type: Number,
      default: 1,
    },
    passingScore: {
      type: Number, // percentage 0-100
      default: 50,
    },
    // Adaptive quiz: difficulty adjusts based on student answers
    isAdaptive: {
      type: Boolean,
      default: false,
    },
    // Shuffle questions order
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    // Show correct answers after submission
    showCorrectAnswers: {
      type: Boolean,
      default: true,
    },
    // AI-generated quiz
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
    // Assigned classes
    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total points
quizSchema.virtual("totalPoints").get(function () {
  return this.questions.reduce((sum, q) => sum + q.points, 0);
});

// Virtual: question count
quizSchema.virtual("questionCount").get(function () {
  return this.questions.length;
});

quizSchema.index({ course: 1 });
quizSchema.index({ module: 1 });
quizSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Quiz", quizSchema);
