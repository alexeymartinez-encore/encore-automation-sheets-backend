const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Phases = sequelize.define(
  "Phases",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.CHAR,
      allowNull: false,
    },
  },
  {
    tableName: "phase",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Phases;
