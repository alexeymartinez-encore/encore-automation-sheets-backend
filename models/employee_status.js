const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Employee = require("./employee");

const EmployeeStatus = sequelize.define(
  "EmployeeStatus",
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
      onUpdate: "CASCADE",
    },
    access_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timesheet_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    overtime_eligible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    active_employee: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    contractor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    tableName: "employee_status",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = EmployeeStatus;
