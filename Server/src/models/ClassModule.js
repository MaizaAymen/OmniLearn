const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ClassModule = sequelize.define(
  "ClassModule",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "classes", key: "id" },
      onDelete: "CASCADE",
    },
    moduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "modules", key: "id" },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "class_modules",
    timestamps: true,
    indexes: [{ unique: true, fields: ["classId", "moduleId"] }],
  }
);

module.exports = ClassModule;
