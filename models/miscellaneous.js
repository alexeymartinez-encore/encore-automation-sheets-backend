const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Miscellaneous = sequelize.define(
  "Miscellaneous",
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
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "miscellaneous",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Miscellaneous;
