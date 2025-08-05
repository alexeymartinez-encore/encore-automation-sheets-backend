const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Employee = require("./employee");

const Expense = sequelize.define(
  "Expense",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Employee,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    date_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    num_of_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    signed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    date_paid: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    total: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    approved_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    processed_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    submitted_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "expense",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Expense;
