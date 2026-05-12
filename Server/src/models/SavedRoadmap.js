const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SavedRoadmap = sequelize.define(
  "SavedRoadmap",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "My Roadmap",
    },
    graph: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: { nodes: [], edges: [] },
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Set when the user earns the certificate for this roadmap
    certificateIssuedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "saved_roadmaps",
    timestamps: true,
  }
);

module.exports = SavedRoadmap;
