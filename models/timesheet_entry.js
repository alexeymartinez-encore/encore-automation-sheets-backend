const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Timesheet = require("./timesheet");
const Project = require("./project");
const Phase = require("./phase");
const CostCode = require("./cost_code");

const TimesheetEntry = sequelize.define(
  "TimesheetEntry",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    timesheet_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Timesheet,
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
    phase_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Phase,
        key: "id",
      },
    },
    cost_code_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: CostCode,
        key: "id",
      },
    },
    row_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mon_reg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    tue_reg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    wed_reg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    thu_reg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    fri_reg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    sat_reg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    sun_reg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    mon_ot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    tue_ot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    wed_ot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    thu_ot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    fri_ot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    sat_ot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    sun_ot: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    total_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: "timesheet_entry",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = TimesheetEntry;
