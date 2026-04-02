const express = require("express");

const userController = require("../controllers/user");
const isAuth = require("../middleware/is-auth");

const router = express.Router();
router.get("/all-employees", userController.getAllEmployees);

router.post(
  "/reports/timecards",
  isAuth,
  userController.getPersonalTimesheetEntriesReport
);

router.post(
  "/reports/expenses",
  isAuth,
  userController.getPersonalExpenseEntriesReport
);

router.get("/:id", isAuth, userController.getUserById);

module.exports = router;
