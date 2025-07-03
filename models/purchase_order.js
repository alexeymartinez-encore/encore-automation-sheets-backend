const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Customer = require("./customer");

const PurchaseOrder = sequelize.define(
  "PurchaseOrder",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    po_value: {
      type: DataTypes.STRING,
      allowNull: false,
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
    tableName: "purchase_order",
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

module.exports = PurchaseOrder;
