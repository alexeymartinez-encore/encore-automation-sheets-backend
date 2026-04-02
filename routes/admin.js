const express = require("express");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");
const authorizeRole = require("../middleware/authorize-role");

const router = express.Router();
const requireAdmin = [isAuth, authorizeRole("admin")];

router.get(
  "/timesheets/missing/:weekEnding",
  ...requireAdmin,
  adminController.getMissingTimesheetsByWeekEnding
);

router.post(
  "/timesheets/missing/remind",
  ...requireAdmin,
  adminController.sendMissingTimesheetReminders
);

router.get(
  "/timesheets/:weekEnding",
  ...requireAdmin,
  adminController.getTimesheetsByWeekEnding
);

// Get Overtime report for the previous 2 weeks
router.get(
  "/timesheets/overtime-report/:date",
  ...requireAdmin,
  adminController.getTimesheetsOvertimeReportBiweekly
);

router.get(
  "/timesheets/vacation-report/:date",
  ...requireAdmin,
  adminController.getTimesheetsVacationReportBiweekly
);

router.get(
  "/timesheets/bereavement-report/:date",
  ...requireAdmin,
  adminController.getTimesheetsBereavementReportBiweekly
);

router.get(
  "/timesheets/sick-report/:date",
  ...requireAdmin,
  adminController.getTimesheetsSickReportBiweekly
);

router.get(
  "/timesheets/juryduty-report/:date",
  ...requireAdmin,
  adminController.getTimesheetsJuryDutyReportBiweekly
);

router.get(
  "/timesheets/labor-report/:date",
  ...requireAdmin,
  adminController.getLaborReportBiweekly
);

router.post(
  "/timesheets/category-entries",
  ...requireAdmin,
  adminController.getTimesheetEntriesByCategory
);

router.get(
  "/expenses/missing/:dateStart",
  ...requireAdmin,
  adminController.getMissingExpensesByMonthStart
);

router.post(
  "/expenses/missing/remind",
  ...requireAdmin,
  adminController.sendMissingExpenseReminders
);

router.get(
  "/expenses/expense-report/:date",
  ...requireAdmin,
  adminController.getExpenseReportMonthly
);

router.get(
  "/expenses/expense-report-open/:dateStart",
  ...requireAdmin,
  adminController.getOpenExpenseReport
);

router.get(
  "/expenses/:dateStart",
  ...requireAdmin,
  adminController.getExpensesByMonthStart
);
router.get("/expense/:id", ...requireAdmin, adminController.getExpenseById);
router.get("/timesheet/:id", ...requireAdmin, adminController.getTimesheetById);
router.get("/open-timesheets", ...requireAdmin, adminController.getOpenTimesheets);

router.get(
  "/open-expenses/:dateStart",
  ...requireAdmin,
  adminController.getOpenExpenses
);

router.get("/employees/get-all", ...requireAdmin, adminController.getAllEmployees);

router.get("/projects/get-all", ...requireAdmin, adminController.getAllProjects);

router.delete(
  "/projects/delete/:id",
  ...requireAdmin,
  adminController.deleteProjectById
);

router.put(
  "/projects/edit/:projectId",
  ...requireAdmin,
  adminController.editProjectById
);

router.put("/employees/edit/:userId", ...requireAdmin, adminController.editUserById);

router.put(
  "/timesheets/status-change",
  ...requireAdmin,
  adminController.saveTimesheetsStatusChanges
);

router.put(
  "/expenses/status-change",
  ...requireAdmin,
  adminController.saveExpensesStatusChanges
);

router.post("/projects/create", ...requireAdmin, adminController.createNewProject);

module.exports = router;
