const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const EventType = sequelize.define(
  "EventType",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    back_color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fore_color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_holiday: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "event_type",
    timestamps: true,
  },
);

module.exports = EventType;
