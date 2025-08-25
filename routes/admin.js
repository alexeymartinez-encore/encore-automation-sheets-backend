const express = require("express");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get(
  "/timesheets/:weekEnding",
  isAuth,
  adminController.getTimesheetsByWeekEnding
);

// Get Overtime report for the previous 2 weeks
router.get(
  "/timesheets/overtime-report/:date",
  isAuth,
  adminController.getTimesheetsOvertimeReportBiweekly
);

router.get(
  "/timesheets/labor-report/:date",
  isAuth,
  adminController.getLaborReportBiweekly
);

router.get(
  "/timesheets/expense-report/:date",
  isAuth,
  adminController.getExpenseReportMonthly
);

router.get(
  "/expenses/:dateStart",
  isAuth,
  adminController.getExpensesByMonthStart
);
router.get("/expense/:id", isAuth, adminController.getExpenseById);
router.get("/timesheet/:id", isAuth, adminController.getTimesheetById);
router.get("/open-timesheets", isAuth, adminController.getOpenTimesheets);

router.get("/open-expenses", isAuth, adminController.getOpenExpenses);

router.get("/employees/get-all", isAuth, adminController.getAllEmployees);

router.get("/projects/get-all", isAuth, adminController.getAllProjects);

router.delete(
  "/projects/delete/:id",
  isAuth,
  adminController.deleteProjectById
);

router.put(
  "/projects/edit/:projectId",
  isAuth,
  adminController.editProjectById
);

router.put(
  "/timesheets/status-change",
  isAuth,
  adminController.saveTimesheetsStatusChanges
);

router.put(
  "/expenses/status-change",
  isAuth,
  adminController.saveExpensesStatusChanges
);

router.post("/projects/create", isAuth, adminController.createNewProject);

module.exports = router;
