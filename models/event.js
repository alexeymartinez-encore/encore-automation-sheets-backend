const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Color = require("./color");
const Employee = require("./employee");

const Event = sequelize.define(
  "Event",
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
    start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    long_description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    back_color_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fore_color_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    formatted_month: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "event", // Explicitly set table name to "Employee"
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Event;
