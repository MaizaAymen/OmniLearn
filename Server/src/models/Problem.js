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
    status: {
      type: DataTypes.ENUM('draft', 'review', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'published',
    },
    scope: {
      type: DataTypes.ENUM('global', 'module'),
      allowNull: false,
      defaultValue: 'global',
    },
    forkedFrom: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    testCasesValidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    moduleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    timestamps: true,
  });

module.exports = Problem;