const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const AuthSession = sequelize.define(
  "AuthSession",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    refresh_token_hash: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    refresh_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    idle_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    absolute_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    last_activity_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revoked_reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(1024),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
  },
  {
    tableName: "auth_session",
    timestamps: true,
  }
);

module.exports = AuthSession;
