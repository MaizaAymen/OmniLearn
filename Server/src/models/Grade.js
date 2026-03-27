const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Grade = sequelize.define(
  "Grade",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true, // e.g., "L1", "L2", "L3", "Master 1"
    },
    displayName: {
      type: DataTypes.STRING(150),
      allowNull: false, // e.g., "Licence 1", "Licence 2"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // For sorting grades in sequence
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "grades",
    timestamps: true,
  }
);

module.exports = Grade;
