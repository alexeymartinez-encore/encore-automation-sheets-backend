const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Customer = require("./customer");

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    short_name: {
      type: DataTypes.CHAR,
      allowNull: false,
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    overtime: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    sga_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    // perdiem: {
    //   type: DataTypes.FLOAT,
    //   allowNull: true,
    // },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Customer,
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "project",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = Project;
