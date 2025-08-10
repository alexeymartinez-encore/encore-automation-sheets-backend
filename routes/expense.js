const express = require("express");

const expenseController = require("../controllers/expense");
const isAuth = require("../middleware/is-auth");
const upload = require("../middleware/multer-middleware"); // Path to your multer config

const router = express.Router();

router.get("/:id", isAuth, expenseController.getExpensesByUserId);

router.post(
  "/save",
  upload.array("receipts"),
  expenseController.saveExpenseSheet
);

// router.post("/save", isAuth, expenseController.saveExpenseSheet);
router.delete(
  "/delete-expense/:id",
  isAuth,
  expenseController.deleteExpenseSheetById
);

router.delete(
  "/expense-entry/:id",
  isAuth,
  expenseController.deleteExpenseEntry
);

router.get(
  "/entries/:id",
  isAuth,
  expenseController.getExpenseEntriesByExpenseId
);

router.delete(
  "/files/:fileId",
  isAuth,
  expenseController.deleteExpenseFileByFileId
);

module.exports = router;
