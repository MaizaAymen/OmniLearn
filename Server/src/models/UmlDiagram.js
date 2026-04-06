const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UmlDiagram = sequelize.define(
  "UmlDiagram",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    topic: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    problemDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    solution: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { nodes: [], edges: [] },
    },
  },
  {
    tableName: "uml_diagrams",
    timestamps: true,
  }
);

module.exports = UmlDiagram;
