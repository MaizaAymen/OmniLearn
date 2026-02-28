const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"], // e.g. "2025-2026"
    },
    section: {
      type: String,
      default: null, // e.g. "A", "B"
    },
    level: {
      type: String,
      default: null, // e.g. "L1", "L2", "L3", "M1", "M2"
    },
    department: {
      type: String,
      default: null, // e.g. "Computer Science"
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A teacher must be assigned to the class"],
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    maxStudents: {
      type: Number,
      default: 30,
    },
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

// Virtual: student count
classSchema.virtual("studentCount").get(function () {
  return this.students ? this.students.length : 0;
});

classSchema.index({ teacher: 1 });
classSchema.index({ academicYear: 1 });

module.exports = mongoose.model("Class", classSchema);
