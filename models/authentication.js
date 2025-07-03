const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Employee = require("./employee");

const Authentication = sequelize.define(
  "Authentication",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Employee, // Foreign key referring to Employee table
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    failed_attempts: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "authentication",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Authentication;
