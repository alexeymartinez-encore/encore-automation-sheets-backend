const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Expense = require("./expense");

const ExpenseFile = sequelize.define(
  "ExpenseFile",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    expense_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Expense,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    upload_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "expense_file",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = ExpenseFile;
