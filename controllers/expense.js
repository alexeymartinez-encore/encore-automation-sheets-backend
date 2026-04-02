const Expense = require("../models/expense");
const ExpenseEntry = require("../models/expense_entry");
const ExpenseFile = require("../models/expense_file");
const Employee = require("../models/employee");
const fs = require("fs");
const path = require("path");
const { literal } = require("sequelize");

const { sequelize } = require("../config/db"); // Import the Sequelize instance
const { parseToDate } = require("../util/dateParser");

const EXPENSE_DATEONLY_ATTRIBUTES = {
  include: [
    [literal("CONVERT(varchar(10), [Expense].[date_start], 23)"), "date_start_db"],
  ],
};

const ROLE_EMPLOYEE = 1;
const ROLE_MANAGER = 2;
const ROLE_ADMIN = 3;

function getActorContext(req) {
  return {
    actorUserId: Number(req.userId),
    actorRoleId: Number(req.userRoleId || ROLE_EMPLOYEE),
  };
}

async function isManagerOfEmployee(managerId, employeeId, transaction = null) {
  if (
    !Number.isInteger(managerId) ||
    !Number.isInteger(employeeId) ||
    employeeId <= 0
  ) {
    return false;
  }

  const managedEmployee = await Employee.findOne({
    where: {
      id: employeeId,
      manager_id: managerId,
    },
    attributes: ["id"],
    ...(transaction ? { transaction } : {}),
  });

  return Boolean(managedEmployee);
}

async function canAccessEmployee({
  actorUserId,
  actorRoleId,
  employeeId,
  transaction = null,
}) {
  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return false;
  }

  if (actorRoleId >= ROLE_ADMIN) {
    return true;
  }

  if (actorRoleId === ROLE_MANAGER) {
    if (employeeId === actorUserId) {
      return true;
    }

    return isManagerOfEmployee(actorUserId, employeeId, transaction);
  }

  return employeeId === actorUserId;
}

async function getAuthorizedExpenseForActor(req, expenseId, transaction = null) {
  const parsedExpenseId = Number(expenseId);
  if (!Number.isInteger(parsedExpenseId) || parsedExpenseId <= 0) {
    return {
      error: {
        statusCode: 400,
        message: "A valid expense ID is required.",
      },
    };
  }

  const expense = await Expense.findByPk(parsedExpenseId, {
    attributes: ["id", "employee_id"],
    ...(transaction ? { transaction } : {}),
  });

  if (!expense) {
    return {
      error: {
        statusCode: 404,
        message: "Expense not found.",
      },
    };
  }

  const { actorUserId, actorRoleId } = getActorContext(req);
  const employeeId = Number(expense.employee_id);
  const isAllowed = await canAccessEmployee({
    actorUserId,
    actorRoleId,
    employeeId,
    transaction,
  });

  if (!isAllowed) {
    return {
      error: {
        statusCode: 403,
        message: "You are not authorized to access this expense.",
      },
    };
  }

  return { expense };
}

function toExpenseResponseModel(expense) {
  const payload = expense?.toJSON ? expense.toJSON() : { ...expense };
  if (payload?.date_start_db) {
    payload.date_start = payload.date_start_db;
  }
  delete payload.date_start_db;
  return payload;
}

// Get Employee Expenses By ID
exports.getExpensesByUserId = async (req, res, next) => {
  const userId = Number(req.params.id);
  const { actorUserId, actorRoleId } = getActorContext(req);

  if (!Number.isInteger(userId) || userId <= 0) {
    const error = new Error("A valid user ID is required.");
    error.statusCode = 400;
    return next(error);
  }

  try {
    const isAllowed = await canAccessEmployee({
      actorUserId,
      actorRoleId,
      employeeId: userId,
    });

    if (!isAllowed) {
      const error = new Error(
        "You are not authorized to view this user's details",
      );
      error.statusCode = 403;
      return next(error);
    }

    const expenses = await Expense.findAll({
      where: {
        employee_id: userId,
      },
      attributes: EXPENSE_DATEONLY_ATTRIBUTES,
      include: [
        {
          model: ExpenseFile,
        },
      ],
    });

    const normalizedExpenses = expenses.map(toExpenseResponseModel);
    console.log(normalizedExpenses);

    res.status(200).json({
      message: "Expense Sheets Fetched Successfully",
      data: normalizedExpenses,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getMyExpenses = async (req, res, next) => {
  const userId = String(req.userId);

  try {
    const expenses = await Expense.findAll({
      where: {
        employee_id: userId,
      },
      attributes: EXPENSE_DATEONLY_ATTRIBUTES,
      include: [
        {
          model: ExpenseFile,
        },
      ],
    });

    const normalizedExpenses = expenses.map(toExpenseResponseModel);

    res.status(200).json({
      message: "Expense Sheets Fetched Successfully",
      data: normalizedExpenses,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Save Expense Sheet with Replace-All Strategy
exports.saveExpenseSheet = async (req, res, next) => {
  const t = await sequelize.transaction(); // Start transaction

  try {
    const expenseData = JSON.parse(req.body.expenseData);
    const expenseEntriesData = JSON.parse(req.body.expenseEntriesData);
    const actorUserId = Number(req.userId);
    const actorRoleId = Number(req.userRoleId || ROLE_EMPLOYEE);

    // Sanitize dates
    expenseData.date_start = parseToDate(expenseData.date_start);
    expenseData.date_paid = parseToDate(expenseData.date_paid);

    if (actorRoleId <= ROLE_EMPLOYEE) {
      expenseData.employee_id = actorUserId;
    } else if (!expenseData.employee_id) {
      expenseData.employee_id = actorUserId;
    }

    const requestedEmployeeId = Number(expenseData.employee_id);
    if (!Number.isInteger(requestedEmployeeId) || requestedEmployeeId <= 0) {
      await t.rollback();
      return res.status(400).json({
        message: "A valid employee_id is required.",
        data: [],
        internalStatus: "fail",
      });
    }

    expenseData.employee_id = requestedEmployeeId;

    if (actorRoleId === ROLE_EMPLOYEE && requestedEmployeeId !== actorUserId) {
      await t.rollback();
      return res.status(403).json({
        message: "You can only create expenses for yourself.",
        data: [],
        internalStatus: "fail",
      });
    }

    if (actorRoleId === ROLE_MANAGER && requestedEmployeeId !== actorUserId) {
      const managedEmployee = await Employee.findOne({
        where: {
          id: requestedEmployeeId,
          manager_id: actorUserId,
        },
        attributes: ["id"],
        transaction: t,
      });

      if (!managedEmployee) {
        await t.rollback();
        return res.status(403).json({
          message: "You can only create expenses for your employees.",
          data: [],
          internalStatus: "fail",
        });
      }
    }

    let savedExpense;

    if (expenseData.id) {
      const existingExpense = await Expense.findByPk(expenseData.id, {
        transaction: t,
      });

      if (!existingExpense) {
        await t.rollback();
        return res.status(404).json({
          message: "Expense not found.",
          data: [],
          internalStatus: "fail",
        });
      }

      const existingEmployeeId = Number(existingExpense.employee_id);

      if (actorRoleId === ROLE_EMPLOYEE && existingEmployeeId !== actorUserId) {
        await t.rollback();
        return res.status(403).json({
          message: "You are not authorized to edit this expense.",
          data: [],
          internalStatus: "fail",
        });
      }

      if (actorRoleId === ROLE_MANAGER && existingEmployeeId !== actorUserId) {
        const managedEmployee = await Employee.findOne({
          where: {
            id: existingEmployeeId,
            manager_id: actorUserId,
          },
          attributes: ["id"],
          transaction: t,
        });

        if (!managedEmployee) {
          await t.rollback();
          return res.status(403).json({
            message: "You are not authorized to edit this expense.",
            data: [],
            internalStatus: "fail",
          });
        }
      }

      if (actorRoleId < ROLE_ADMIN && requestedEmployeeId !== existingEmployeeId) {
        await t.rollback();
        return res.status(403).json({
          message: "You cannot move an existing expense to a different employee.",
          data: [],
          internalStatus: "fail",
        });
      }

      if (actorRoleId < ROLE_ADMIN) {
        expenseData.employee_id = existingEmployeeId;
      }
    }

    // Check for duplicate expense (by employee_id + date_start) only when creating new
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
        { where: { id: expenseData.id }, transaction: t },
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
        { transaction: t },
      );
    }

    if (!savedExpense.id) throw new Error("Failed to save expense");

    // Shared predicate to define “meaningfully filled”
    const isMeaningfullyFilled = (entry) => {
      const num = (v) => Number(v || 0);
      const str = (v) => (v ?? "").trim();

      const anyNonZeroAmount =
        num(entry.destination_cost) !== 0 ||
        num(entry.lodging_cost) !== 0 ||
        num(entry.other_expense_cost) !== 0 ||
        num(entry.car_rental_cost) !== 0 ||
        num(entry.miles) !== 0 ||
        num(entry.miles_cost) !== 0 ||
        num(entry.perdiem_cost) !== 0 ||
        num(entry.entertainment_cost) !== 0 ||
        num(entry.miscellaneous_amount) !== 0;

      const anyText =
        str(entry.purpose) !== "" || str(entry.destination_name) !== "";

      return anyNonZeroAmount || anyText;
    };

    // === Replace-All Strategy for Entries ===
    // Clear existing entries so we store exactly what the client sends
    await ExpenseEntry.destroy({
      where: { expense_id: savedExpense.id },
      transaction: t,
    });

    // Upsert incoming entries
    const savedEntries = [];
    const seenKeys = new Set();
    for (const entry of expenseEntriesData) {
      const filled = isMeaningfullyFilled(entry);
      if (!filled) continue; // skip empty rows

      // Deduplicate identical rows in the same payload (protect against UI double-submit)
      const key = JSON.stringify({
        day: Number(entry.day) || null,
        project_id: Number(entry.project_id) || null,
        purpose: (entry.purpose || "").trim(),
        destination_name: (entry.destination_name || "").trim(),
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
      });
      if (seenKeys.has(key)) {
        continue; // drop exact duplicates
      }
      seenKeys.add(key);

      // recreate from scratch to avoid accumulating duplicates across saves
      const created = await ExpenseEntry.create(
        {
          expense_id: savedExpense.id,
          project_id: Number(entry.project_id) || null,
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
        { transaction: t },
      );
      savedEntries.push(created);
    }

    // Handle uploaded receipts (same as before)
    const receiptFiles = req.files || [];
    const receiptEntryIds = req.body.receiptEntryIds || [];

    const parsedEntryIds = Array.isArray(receiptEntryIds)
      ? receiptEntryIds
      : [receiptEntryIds];

    for (let i = 0; i < receiptFiles.length; i++) {
      const file = receiptFiles[i];
      const entryId = parsedEntryIds[i];

      await ExpenseFile.create(
        {
          expense_id: savedExpense.id,
          url: file.path,
          upload_date: new Date(),
        },
        { transaction: t },
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

    const { error } = await getAuthorizedExpenseForActor(req, expenseId, t);
    if (error) {
      await t.rollback();
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

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
      { where: { id: expenseId }, transaction: t },
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

// Delete  Expense Sheet by ID
exports.deleteExpenseSheetById = async (req, res, next) => {
  const expenseId = req.params.id;

  try {
    const { error } = await getAuthorizedExpenseForActor(req, expenseId);
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

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
    const { error } = await getAuthorizedExpenseForActor(req, expenseId);
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

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

    const { error } = await getAuthorizedExpenseForActor(req, fileRecord.expense_id);
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
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
