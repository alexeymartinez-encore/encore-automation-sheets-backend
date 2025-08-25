const Expense = require("../models/expense");
const ExpenseEntry = require("../models/expense_entry");
const ExpenseFile = require("../models/expense_file");
const fs = require("fs");
const path = require("path");

const { sequelize } = require("../config/db"); // Import the Sequelize instance
const { parseToDate } = require("../util/dateParser");

// Get Employee Expenses By ID
exports.getExpensesByUserId = async (req, res, next) => {
  const userId = req.params.id;
  const authenticatedUserId = req.userId; // ID From the token (set in isAuth Middleware)
  if (authenticatedUserId !== userId) {
    // console.log("Can't see You need to be the user or an admin");
    const error = new Error(
      "You are not authorized to view this user's details"
    );
    error.statusCode = 403; //forbidden
    return next(error);
  }

  try {
    const expenses = await Expense.findAll({
      where: {
        employee_id: userId,
      },
      include: [
        {
          model: ExpenseFile,
        },
      ],
    });

    res.status(200).json({
      message: "Expense Sheets Fetched Successfully",
      data: expenses,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Save Expense Sheet with ID and Data
exports.saveExpenseSheet = async (req, res, next) => {
  const t = await sequelize.transaction(); // Start transaction

  try {
    const expenseData = JSON.parse(req.body.expenseData);
    const expenseEntriesData = JSON.parse(req.body.expenseEntriesData);

    // Sanitize dates
    expenseData.date_start = parseToDate(expenseData.date_start);
    expenseData.date_paid = parseToDate(expenseData.date_paid);

    let savedExpense;

    // Check for duplicate expense (by employee_id + date_start)
    if (!expenseData.id) {
      const existingExpense = await Expense.findOne({
        where: {
          employee_id: expenseData.employee_id,
          date_start: expenseData.date_start,
        },
        transaction: t,
      });

      if (existingExpense) {
        await t.rollback();
        return res.status(200).json({
          message: "Expense Already Exists (Existing Date)",
          data: { expense: [], entries: [] },
          internalStatus: "fail",
        });
      }
    }

    // Save or update the Expense
    if (expenseData.id) {
      await Expense.update(
        {
          approved: expenseData.approved || false,
          approved_by: expenseData.approved_by || "None",
          date_paid: expenseData.date_paid || null,
          employee_id: Number(expenseData.employee_id),
          message: expenseData.message || "None",
          paid: expenseData.paid || false,
          processed_by: expenseData.processed_by || "None",
          signed: expenseData.signed || false,
          submitted_by: expenseData.submitted_by || "None",
          num_of_days: expenseData.num_of_days,
          date_start: expenseData.date_start,
          total: expenseData.total,
        },
        { where: { id: expenseData.id }, transaction: t }
      );
      savedExpense = await Expense.findByPk(expenseData.id, { transaction: t });
    } else {
      savedExpense = await Expense.create(
        {
          approved: expenseData.approved || false,
          approved_by: expenseData.approved_by || "None",
          date_paid: expenseData.date_paid || null,
          employee_id: Number(expenseData.employee_id),
          message: expenseData.message || "None",
          paid: expenseData.paid || false,
          processed_by: expenseData.processed_by || "None",
          signed: expenseData.signed || false,
          submitted_by: expenseData.submitted_by || "None",
          num_of_days: expenseData.num_of_days,
          date_start: expenseData.date_start,
          total: expenseData.total,
        },
        { transaction: t }
      );

      if (!savedExpense.id) throw new Error("Failed to save expense");
    }

    //  shared predicate to define “meaningfully filled”
    const isMeaningfullyFilled = (entry) => {
      const num = (v) => Number(v || 0);
      const str = (v) => (v ?? "").trim();

      const anyPositiveAmount =
        num(entry.destination_cost) > 0 ||
        num(entry.lodging_cost) > 0 ||
        num(entry.other_expense_cost) > 0 ||
        num(entry.car_rental_cost) > 0 ||
        num(entry.miles) > 0 ||
        num(entry.miles_cost) > 0 ||
        num(entry.perdiem_cost) > 0 ||
        num(entry.entertainment_cost) > 0 ||
        num(entry.miscellaneous_amount) > 0;

      const anyText =
        str(entry.purpose) !== "" || str(entry.destination_name) !== "";

      // Do NOT count project_id alone as meaningful
      return anyPositiveAmount || anyText;
    };

    // Save or update expense entries
    const savedEntries = await Promise.all(
      expenseEntriesData.map(async (entry) => {
        const creatingNew = !entry.id;

        // skip creating totally empty rows
        if (creatingNew && !isMeaningfullyFilled(entry)) {
          return null;
        }

        if (entry.id) {
          const existingEntry = await ExpenseEntry.findOne({
            where: { id: entry.id },
            transaction: t,
          });

          if (!existingEntry) {
            throw new Error(`Expense entry with ID ${entry.id} not found`);
          }

          //   if user cleared an existing row, delete it
          if (!isMeaningfullyFilled(entry)) {
            await existingEntry.destroy({ transaction: t });
            return null;
          }

          return existingEntry.update(
            {
              project_id: Number(entry.project_id) || 2,
              purpose: entry.purpose || "Nothing",
              day: Number(entry.day) || null,
              destination_name: entry.destination_name,
              destination_cost: Number(entry.destination_cost) || 0,
              lodging_cost: Number(entry.lodging_cost) || 0,
              other_expense_cost: Number(entry.other_expense_cost) || 0,
              car_rental_cost: Number(entry.car_rental_cost) || 0,
              miles: Number(entry.miles) || 0,
              miles_cost: Number(entry.miles_cost) || 0,
              perdiem_cost: Number(entry.perdiem_cost) || 0,
              entertainment_cost: Number(entry.entertainment_cost) || 0,
              miscellaneous_description_id:
                Number(entry.miscellaneous_description_id) || 1,
              miscellaneous_amount: Number(entry.miscellaneous_amount) || 0,
            },
            { transaction: t }
          );
        } else {
          // Only reached if meaningfully filled
          return ExpenseEntry.create(
            {
              expense_id: Number(savedExpense.id),
              project_id: Number(entry.project_id) || 2,
              purpose: entry.purpose || "Nothing",
              day: Number(entry.day) || null,
              destination_name: entry.destination_name,
              destination_cost: Number(entry.destination_cost) || 0,
              lodging_cost: Number(entry.lodging_cost) || 0,
              other_expense_cost: Number(entry.other_expense_cost) || 0,
              car_rental_cost: Number(entry.car_rental_cost) || 0,
              miles: Number(entry.miles) || 0,
              miles_cost: Number(entry.miles_cost) || 0,
              perdiem_cost: Number(entry.perdiem_cost) || 0,
              entertainment_cost: Number(entry.entertainment_cost) || 0,
              miscellaneous_description_id:
                Number(entry.miscellaneous_description_id) || 1,
              miscellaneous_amount: Number(entry.miscellaneous_amount) || 0,
            },
            { transaction: t }
          );
        }
      })
    );

    // Handle uploaded receipts and map them to correct entry
    const receiptFiles = req.files || [];
    const receiptEntryIds = req.body.receiptEntryIds || [];

    const parsedEntryIds = Array.isArray(receiptEntryIds)
      ? receiptEntryIds
      : [receiptEntryIds]; // normalize single string to array

    for (let i = 0; i < receiptFiles.length; i++) {
      const file = receiptFiles[i];
      const entryId = parsedEntryIds[i];

      await ExpenseFile.create(
        {
          expense_id: Number(savedExpense.id),
          url: file.path,
          upload_date: new Date(),
        },
        { transaction: t }
      );
    }

    // Commit transaction
    await t.commit();

    return res.status(200).json({
      message: "Expense Saved Successfully",
      data: { expense: savedExpense, entries: savedEntries },
      internalStatus: "success",
    });
  } catch (error) {
    try {
      if (t && !t.finished && t.finished !== "rollback") {
        await t.rollback();
      }
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.message);
    }

    console.error("Error saving expense and entries:", error);
    return res.status(500).json({
      message: "Error saving expense and entries",
      error: error.message,
    });
  }
};

// Delete a single expense entry by ID
exports.deleteExpenseEntry = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res
      .status(400)
      .json({ message: "Invalid id", internalStatus: "fail" });
  }

  const t = await sequelize.transaction();
  try {
    // 1) Find the entry to get its parent expense_id
    const entry = await ExpenseEntry.findByPk(id, { transaction: t });
    if (!entry) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Expense entry not found", internalStatus: "fail" });
    }
    const expenseId = entry.expense_id;

    // 2) Delete the entry
    await entry.destroy({ transaction: t });

    // 3) Recompute total for the parent expense
    const remaining = await ExpenseEntry.findAll({
      where: { expense_id: expenseId },
      transaction: t,
      raw: true,
    });

    const num = (v) => Number(v || 0);
    const newTotal = remaining.reduce((sum, e) => {
      return (
        sum +
        num(e.destination_cost) +
        num(e.lodging_cost) +
        num(e.other_expense_cost) +
        num(e.car_rental_cost) +
        num(e.miles_cost) +
        num(e.perdiem_cost) +
        num(e.entertainment_cost) +
        num(e.miscellaneous_amount)
      );
    }, 0);

    // 4) Update the Expense.total
    await Expense.update(
      { total: Number(newTotal.toFixed(2)) },
      { where: { id: expenseId }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "Expense entry deleted and total updated",
      internalStatus: "success",
      data: { expense_id: expenseId, new_total: Number(newTotal.toFixed(2)) },
    });
  } catch (err) {
    try {
      await t.rollback();
    } catch {}
    console.error("Error deleting expense entry:", err);
    return res.status(500).json({
      message: "Error deleting expense entry",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Save Expense Sheet with ID and Data
exports.saveExpenseSheet = async (req, res, next) => {
  const t = await sequelize.transaction(); // Start transaction

  try {
    const expenseData = JSON.parse(req.body.expenseData);
    const expenseEntriesData = JSON.parse(req.body.expenseEntriesData);

    // Sanitize dates
    expenseData.date_start = parseToDate(expenseData.date_start);
    expenseData.date_paid = parseToDate(expenseData.date_paid);

    let savedExpense;

    // Check for duplicate expense (by employee_id + date_start)
    if (!expenseData.id) {
      const existingExpense = await Expense.findOne({
        where: {
          employee_id: expenseData.employee_id,
          date_start: expenseData.date_start,
        },
        transaction: t,
      });

      if (existingExpense) {
        await t.rollback();
        return res.status(200).json({
          message: "Expense Already Exists (Existing Date)",
          data: { expense: [], entries: [] },
          internalStatus: "fail",
        });
      }
    }

    // Save or update the Expense
    if (expenseData.id) {
      await Expense.update(
        {
          approved: expenseData.approved || false,
          approved_by: expenseData.approved_by || "None",
          date_paid: expenseData.date_paid || null,
          employee_id: Number(expenseData.employee_id),
          message: expenseData.message || "None",
          paid: expenseData.paid || false,
          processed_by: expenseData.processed_by || "None",
          signed: expenseData.signed || false,
          submitted_by: expenseData.submitted_by || "None",
          num_of_days: expenseData.num_of_days,
          date_start: expenseData.date_start,
          total: expenseData.total,
        },
        { where: { id: expenseData.id }, transaction: t }
      );
      savedExpense = await Expense.findByPk(expenseData.id, { transaction: t });
    } else {
      savedExpense = await Expense.create(
        {
          approved: expenseData.approved || false,
          approved_by: expenseData.approved_by || "None",
          date_paid: expenseData.date_paid || null,
          employee_id: Number(expenseData.employee_id),
          message: expenseData.message || "None",
          paid: expenseData.paid || false,
          processed_by: expenseData.processed_by || "None",
          signed: expenseData.signed || false,
          submitted_by: expenseData.submitted_by || "None",
          num_of_days: expenseData.num_of_days,
          date_start: expenseData.date_start,
          total: expenseData.total,
        },
        { transaction: t }
      );

      if (!savedExpense.id) throw new Error("Failed to save expense");
    }

    // Save or update expense entries
    const savedEntries = await Promise.all(
      expenseEntriesData.map(async (entry) => {
        if (entry.id) {
          const existingEntry = await ExpenseEntry.findOne({
            where: { id: entry.id },
            transaction: t,
          });

          if (!existingEntry) {
            throw new Error(`Expense entry with ID ${entry.id} not found`);
          }

          return existingEntry.update(
            {
              project_id: Number(entry.project_id) || 2,
              purpose: entry.purpose || "Nothing",
              day: Number(entry.day) || null,
              destination_name: entry.destination_name,
              destination_cost: Number(entry.destination_cost) || 0,
              lodging_cost: Number(entry.lodging_cost) || 0,
              other_expense_cost: Number(entry.other_expense_cost) || 0,
              car_rental_cost: Number(entry.car_rental_cost) || 0,
              miles: Number(entry.miles) || 0,
              miles_cost: Number(entry.miles_cost) || 0,
              perdiem_cost: Number(entry.perdiem_cost) || 0,
              entertainment_cost: Number(entry.entertainment_cost) || 0,
              miscellaneous_description_id:
                Number(entry.miscellaneous_description_id) || 1,
              miscellaneous_amount: Number(entry.miscellaneous_amount) || 0,
            },
            { transaction: t }
          );
        } else {
          return ExpenseEntry.create(
            {
              expense_id: Number(savedExpense.id),
              project_id: Number(entry.project_id) || 2,
              purpose: entry.purpose || "Nothing",
              day: Number(entry.day) || null,
              destination_name: entry.destination_name,
              destination_cost: Number(entry.destination_cost) || 0,
              lodging_cost: Number(entry.lodging_cost) || 0,
              other_expense_cost: Number(entry.other_expense_cost) || 0,
              car_rental_cost: Number(entry.car_rental_cost) || 0,
              miles: Number(entry.miles) || 0,
              miles_cost: Number(entry.miles_cost) || 0,
              perdiem_cost: Number(entry.perdiem_cost) || 0,
              entertainment_cost: Number(entry.entertainment_cost) || 0,
              miscellaneous_description_id:
                Number(entry.miscellaneous_description_id) || 1,
              miscellaneous_amount: Number(entry.miscellaneous_amount) || 0,
            },
            { transaction: t }
          );
        }
      })
    );

    // Handle uploaded receipts and map them to correct entry
    const receiptFiles = req.files || [];
    const receiptEntryIds = req.body.receiptEntryIds || [];

    const parsedEntryIds = Array.isArray(receiptEntryIds)
      ? receiptEntryIds
      : [receiptEntryIds]; // normalize single string to array

    for (let i = 0; i < receiptFiles.length; i++) {
      const file = receiptFiles[i];
      const entryId = parsedEntryIds[i];

      await ExpenseFile.create(
        {
          expense_id: Number(savedExpense.id),
          url: file.path,
          upload_date: new Date(),
        },
        { transaction: t }
      );
    }

    // Commit transaction
    await t.commit();

    return res.status(200).json({
      message: "Expense Saved Successfully",
      data: { expense: savedExpense, entries: savedEntries },
      internalStatus: "success",
    });
  } catch (error) {
    try {
      if (t && !t.finished && t.finished !== "rollback") {
        await t.rollback();
      }
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.message);
    }

    console.error("Error saving expense and entries:", error);
    return res.status(500).json({
      message: "Error saving expense and entries",
      error: error.message,
    });
  }
};

// Delete  Expense Sheet by ID
exports.deleteExpenseSheetById = async (req, res, next) => {
  const expenseId = req.params.id;

  try {
    // Delete all entries associated with this timesheet
    await ExpenseEntry.destroy({
      where: {
        expense_id: expenseId,
      },
    });

    // Then delete the timesheet itself
    const expense = await Expense.destroy({
      where: {
        id: expenseId,
      },
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found",
        data: [],
        internalStatus: "fail",
      });
    }

    res.status(200).json({
      message: "Expense and associated entries deleted successfully",
      data: [],
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getExpenseEntriesByExpenseId = async (req, res, next) => {
  const expenseId = req.params.id;

  try {
    const expenseEntries = await ExpenseEntry.findAll({
      where: {
        expense_id: expenseId,
      },
      // include: [
      //   {
      //     model: ExpenseFile,
      //   },
      // ],
    });

    res.status(200).json({
      data: expenseEntries,
      message: "Timesheet entries fetched successfully",
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteExpenseFileByFileId = async (req, res, next) => {
  const fileId = req.params.fileId;

  try {
    // Step 1: Find the file record in DB
    const fileRecord = await ExpenseFile.findByPk(fileId);
    if (!fileRecord) {
      return res.status(404).json({
        message: "File not found",
        internalStatus: "fail",
      });
    }

    // Step 2: Delete file from disk (optional)
    const filePath = path.join(__dirname, "..", "uploads", fileRecord.url);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("Failed to delete file from disk:", err);
        return res.status(500).json({
          message: "Failed to delete file from disk",
          internalStatus: "fail",
        });
      }
    });

    // Step 3: Delete DB record
    await ExpenseFile.destroy({ where: { id: fileId } });

    return res.status(200).json({
      message: "File deleted successfully",
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({
      message: "Internal server error",
      internalStatus: "fail",
    });
  }
};
