const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Role = sequelize.define(
  "role",
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      comment: "Primary key for role table",
    },
    role_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "Name of the role (e.g., Admin, Manager, Employee)",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Description of the role",
    },
  },
  {
    tableName: "role", // Explicitly set table name to "Employee"
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Role;
