const express = require("express");

const timesheetController = require("../controllers/timesheet");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

// Get All Timesheets By USer ID
router.get("/:id", isAuth, timesheetController.getTimesheetsByUserId);

// Get All Entries for a Specific Timesheet
router.get(
  "/entries/:id",
  isAuth,
  timesheetController.getTimesheetEntriesByTimesheetId
);

router.put("/edit-entries", isAuth, timesheetController.editTimesheetEntries);

router.delete(
  "/delete-timesheet/:id",
  isAuth,
  timesheetController.deleteTimesheetById
);

router.delete(
  "/delete-timesheet-entry/:id",
  isAuth,
  timesheetController.deleteTimesheetEntryById
);

router.post("/save", isAuth, timesheetController.saveTimesheet);
router.post("/sign/:id", isAuth, timesheetController.signTimesheetById);

module.exports = router;
