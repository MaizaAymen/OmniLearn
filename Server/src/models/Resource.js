const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Resource title is required"],
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
      required: [true, "Module reference is required"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Resource type
    type: {
      type: String,
      enum: ["pdf", "video", "code", "document", "image", "link", "other"],
      required: [true, "Resource type is required"],
    },
    // File path or URL
    fileUrl: {
      type: String,
      required: [true, "File URL or path is required"],
    },
    // Original filename
    originalName: {
      type: String,
      default: null,
    },
    // MIME type
    mimeType: {
      type: String,
      default: null,
    },
    // File size in bytes
    fileSize: {
      type: Number,
      default: null,
    },
    // For code files: language
    language: {
      type: String,
      default: null, // "python", "java", "c", "javascript"
    },
    // Order within the module
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

resourceSchema.index({ module: 1, order: 1 });

module.exports = mongoose.model("Resource", resourceSchema);
