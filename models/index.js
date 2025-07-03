const { sequelize } = require("../config/db");

// Import all models
const Employee = require("./employee");
const Role = require("./role");
const Authentication = require("./authentication");
const EmployeeStatus = require("./employee_status");
const Timesheet = require("./timesheet");
const TimesheetEntry = require("./timesheet_entry");
const ExpenseFile = require("./expense_file");
const Project = require("./project");
const CostCode = require("./cost_code");
const Phase = require("./phase");
const Customer = require("./customer");
const PurchaseOrder = require("./purchase_order");
const Expense = require("./expense");
const ExpenseEntry = require("./expense_entry");
const Miscellaneous = require("./miscellaneous");

// Associations
Employee.hasMany(Timesheet, { foreignKey: "employee_id", onDelete: "CASCADE" });
Timesheet.belongsTo(Employee, { foreignKey: "employee_id" });

Employee.hasOne(EmployeeStatus, {
  foreignKey: "employee_id",
  onDelete: "CASCADE",
});
EmployeeStatus.belongsTo(Employee, { foreignKey: "employee_id" });

Employee.hasMany(Expense, { foreignKey: "employee_id", onDelete: "CASCADE" });
Expense.belongsTo(Employee, { foreignKey: "employee_id" });

Expense.hasMany(ExpenseEntry, {
  foreignKey: "expense_id",
  onDelete: "CASCADE",
});
ExpenseEntry.belongsTo(Expense, { foreignKey: "expense_id" });

ExpenseEntry.belongsTo(Project, {
  foreignKey: "project_id",
  onDelete: "CASCADE",
});
Project.hasMany(ExpenseEntry, {
  foreignKey: "project_id",
  onDelete: "CASCADE",
});

ExpenseEntry.belongsTo(Miscellaneous, {
  foreignKey: "miscellaneous_description_id",
  // as: "Miscellaneous",
  onDelete: "CASCADE",
});

Expense.hasMany(ExpenseFile, {
  foreignKey: "expense_id",
  onDelete: "CASCADE",
});
ExpenseFile.belongsTo(Expense, {
  foreignKey: "expense_id",
});

Miscellaneous.hasMany(ExpenseEntry, {
  foreignKey: "miscellaneous_description_id",
  onDelete: "CASCADE",
});

Timesheet.hasMany(TimesheetEntry, {
  foreignKey: "timesheet_id",
  onDelete: "CASCADE",
});
TimesheetEntry.belongsTo(Timesheet, { foreignKey: "timesheet_id" });

Project.hasMany(TimesheetEntry, {
  foreignKey: "project_id",
  onDelete: "CASCADE",
});
TimesheetEntry.belongsTo(Project, { foreignKey: "project_id" });

CostCode.hasMany(TimesheetEntry, {
  foreignKey: "cost_code_id",
  onDelete: "CASCADE",
});
TimesheetEntry.belongsTo(CostCode, { foreignKey: "cost_code_id" });

Phase.hasMany(TimesheetEntry, { foreignKey: "phase_id", onDelete: "CASCADE" });
TimesheetEntry.belongsTo(Phase, { foreignKey: "phase_id" });

Customer.hasMany(Project, { foreignKey: "customer_id", onDelete: "CASCADE" });
Project.belongsTo(Customer, { foreignKey: "customer_id" });

Customer.hasMany(PurchaseOrder, {
  foreignKey: "customer_id",
  onDelete: "CASCADE",
});
PurchaseOrder.belongsTo(Customer, { foreignKey: "customer_id" });

Employee.hasOne(Authentication, { foreignKey: "user_id", onDelete: "CASCADE" });
Authentication.belongsTo(Employee, { foreignKey: "user_id" });

Employee.belongsTo(Role, { foreignKey: "role_id", onDelete: "CASCADE" });
Role.hasMany(Employee, { foreignKey: "role_id" });

module.exports = {
  sequelize,
  Employee,
  Role,
  Authentication,
  EmployeeStatus,
  Timesheet,
  TimesheetEntry,
  ExpenseFile,
  Project,
  CostCode,
  Phase,
  Customer,
  PurchaseOrder,
  Expense,
  ExpenseEntry,
  Miscellaneous,
};
