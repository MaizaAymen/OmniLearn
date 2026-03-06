const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Resource = sequelize.define(
  "Resource",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    moduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "modules", key: "id" },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("pdf", "video", "code", "document", "image", "link"),
      allowNull: false,
    },
    // Public URL (external or CDN)
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Local server file path (multer uploads)
    filePath: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    sizeBytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "resources",
    timestamps: true,
  }
);

module.exports = Resource;
