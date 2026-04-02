const express = require("express");

const managerController = require("../controllers/manager");
const isAuth = require("../middleware/is-auth");
const authorizeRole = require("../middleware/authorize-role");

const router = express.Router();
const requireManager = [isAuth, authorizeRole(["manager", "admin"])];

router.get(
  "/timesheets/:weekEnding",
  ...requireManager,
  managerController.getTimesheetsByWeekEnding
);

// Get Overtime report for the previous 2 weeks
router.get(
  "/timesheets/overtime-report/:date",
  ...requireManager,
  managerController.getTimesheetsOvertimeReportBiweekly
);

router.get(
  "/timesheets/labor-report/:date",
  ...requireManager,
  managerController.getLaborReportBiweekly
);

router.get(
  "/timesheets/expense-report/:date",
  ...requireManager,
  managerController.getExpenseReportMonthly
);

router.get(
  "/expenses/:dateStart",
  ...requireManager,
  managerController.getExpensesByMonthStart
);

router.get("/open-expenses", ...requireManager, managerController.getOpenExpenses);

router.get("/employees/get-all", ...requireManager, managerController.getAllEmployees);

router.get("/projects/get-all", ...requireManager, managerController.getAllProjects);

router.put(
  "/projects/edit/:projectId",
  ...requireManager,
  managerController.editProjectById
);

router.put(
  "/timesheets/status-change",
  ...requireManager,
  managerController.saveTimesheetsStatusChanges
);

router.put(
  "/expenses/status-change",
  ...requireManager,
  managerController.saveExpensesStatusChanges
);

module.exports = router;
