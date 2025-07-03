const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Employee = require("./employee");

const Timesheet = sequelize.define(
  "Timesheet",
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
    week_ending: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_reg_hours: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    total_overtime: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    date_processed: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    processed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    approved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    signed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    approved_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    processed_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    submitted_by: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "timesheet",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Timesheet;
