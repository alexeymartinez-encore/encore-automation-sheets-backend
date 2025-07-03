const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Color = sequelize.define(
  "Color",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    color_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "color", // Explicitly set table name to "Employee"
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Color;
