const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Expense = require("./expense");
const Project = require("./project");

const ExpenseEntry = sequelize.define(
  "ExpenseEntry",
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
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Project,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    day: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    destination_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    destination_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    lodging_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    other_expense_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    car_rental_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    miles: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    miles_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    perdiem_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    entertainment_cost: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    miscellaneous_description_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    miscellaneous_amount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
  },
  {
    tableName: "expense_entry",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = ExpenseEntry;
