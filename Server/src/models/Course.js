const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
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
    // Classes this course is assigned to
    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],
    // Ordered modules within this course
    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
      },
    ],
    category: {
      type: String,
      default: null, // e.g. "Programming", "Databases", "Networking"
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "mixed"],
      default: "mixed",
    },
    thumbnail: {
      type: String,
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
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

courseSchema.index({ teacher: 1 });
courseSchema.index({ classes: 1 });
courseSchema.index({ isPublished: 1 });

module.exports = mongoose.model("Course", courseSchema);
