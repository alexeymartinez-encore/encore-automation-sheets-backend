const Expense = require("../models/expense");
const ExpenseEntry = require("../models/expense_entry");
const ExpenseFile = require("../models/expense_file");
const fs = require("fs");
const path = require("path");

const { sequelize } = require("../config/db"); // Import the Sequelize instance

// Get Employee Expenses By ID
exports.getExpensesByUserId = async (req, res, next) => {
  const userId = req.params.id;
  const authenticatedUserId = req.userId; // ID From the token (set in isAuth Middleware)

  if (authenticatedUserId !== userId) {
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

exports.getExpenseEntriesByTimesheetId = async (req, res, next) => {
  const expenseId = req.params.id;

  try {
    const expenseEntries = await ExpenseEntry.findAll({
      where: {
        expense_id: expenseId,
      },
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
