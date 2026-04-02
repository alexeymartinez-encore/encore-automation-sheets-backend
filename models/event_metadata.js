const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const EventMetadata = sequelize.define(
  "EventMetadata",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: "event",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    event_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "event_type",
        key: "id",
      },
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
  },
  {
    tableName: "event_metadata",
    timestamps: true,
  }
);

module.exports = EventMetadata;
