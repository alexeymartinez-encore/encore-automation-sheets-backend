const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const CostCodes = sequelize.define(
  "CostCodes",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    cost_code: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.CHAR,
      allowNull: false,
    },
  },
  {
    tableName: "cost_code",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = CostCodes;
