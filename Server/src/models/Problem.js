const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Problem = sequelize.define(
    'Problem', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    examples: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    constraints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    hints: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    starterCode: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    expectedOutput: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    roadmap: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    timestamps: true, // adds createdAt and updatedAt
  });

module.exports = Problem;