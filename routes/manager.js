const express = require("express");

const managerController = require("../controllers/manager");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get(
  "/timesheets/:weekEnding",
  isAuth,
  managerController.getTimesheetsByWeekEnding
);

// Get Overtime report for the previous 2 weeks
router.get(
  "/timesheets/overtime-report/:date",
  isAuth,
  managerController.getTimesheetsOvertimeReportBiweekly
);

router.get(
  "/timesheets/labor-report/:date",
  isAuth,
  managerController.getLaborReportBiweekly
);

router.get(
  "/timesheets/expense-report/:date",
  isAuth,
  managerController.getExpenseReportMonthly
);

router.get(
  "/expenses/:dateStart",
  isAuth,
  managerController.getExpensesByMonthStart
);

router.get("/open-expenses", isAuth, managerController.getOpenExpenses);

router.get("/employees/get-all", isAuth, managerController.getAllEmployees);

router.get("/projects/get-all", isAuth, managerController.getAllProjects);

router.put(
  "/projects/edit/:projectId",
  isAuth,
  managerController.editProjectById
);

router.put(
  "/timesheets/status-change",
  isAuth,
  managerController.saveTimesheetsStatusChanges
);

router.put(
  "/expenses/status-change",
  isAuth,
  managerController.saveExpensesStatusChanges
);

module.exports = router;
