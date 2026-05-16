const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Conversation = sequelize.define(
  "Conversation",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM("group", "private"),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    members: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    },
    // Group owner (null for private conversations).
    ownerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // Users who were invited but have not yet accepted.
    pendingInvites: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    },
    // Users banned by the owner — they cannot be invited back.
    bannedIds: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: "conversations",
    timestamps: true,
  }
);

module.exports = Conversation;
