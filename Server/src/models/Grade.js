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
    // institutionId = null  → global / template grade (managed by super admin)
    // institutionId = <id>  → owned by that institution (managed by its admin)
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false, // unique per institution — enforced at the route layer
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
