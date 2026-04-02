const moment = require("moment");
const { Op } = require("sequelize");

const {
  Employee,
  Timesheet,
  TimesheetEntry,
  Project,
  Phase,
  CostCode,
  Expense,
  ExpenseEntry,
} = require("../models");

function parseOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeDateRange(from, to) {
  const fromDate = moment(from, moment.ISO_8601, true);
  const toDate = moment(to, moment.ISO_8601, true);

  if (!fromDate.isValid() || !toDate.isValid()) {
    return { error: "Invalid date format. Use YYYY-MM-DD or ISO strings." };
  }

  if (toDate.isBefore(fromDate)) {
    return { error: "The end date must be on or after the start date." };
  }

  return {
    from: fromDate.format("YYYY-MM-DD"),
    to: toDate.format("YYYY-MM-DD"),
  };
}

function sumExpenseEntryTotals(entry) {
  const fields = [
    "destination_cost",
    "lodging_cost",
    "other_expense_cost",
    "car_rental_cost",
    "miles_cost",
    "perdiem_cost",
    "entertainment_cost",
    "miscellaneous_amount",
  ];

  return fields.reduce((sum, field) => sum + (parseFloat(entry[field]) || 0), 0);
}

exports.getUserById = (req, res, next) => {
  const userId = req.params.id;
  const authenticatedUserId = req.userId; // ID From the token (set in isAuth Middleware)

  if (authenticatedUserId !== userId) {
    const error = new Error(
      "You are not authorized to view this user's details"
    );
    error.statusCode = 403; //forbidden
    return next(error);
  }

  // Find the employee by the user id
  Employee.findByPk(userId)
    .then((employee) => {
      if (!employee) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ employee });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getAllEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.findAll({
      attributes: ["id", "first_name", "last_name"],
    });

    // Send the response
    res.status(200).json({
      message: "Request Successful!",
      data: employees,
      internalStatus: "success",
    });
  } catch (err) {
    // Log the error details
    console.error("Error fetching timesheets:", err);
    res.status(500).json({
      message: "Error fetching timesheets",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

exports.getPersonalTimesheetEntriesReport = async (req, res) => {
  const { from, to, projectId, phaseId, costCodeId } = req.body;

  if (!from || !to) {
    return res.status(400).json({
      message: "Both from and to dates are required.",
      data: [],
      internalStatus: "fail",
    });
  }

  const normalizedRange = normalizeDateRange(from, to);
  if (normalizedRange.error) {
    return res.status(400).json({
      message: normalizedRange.error,
      data: [],
      internalStatus: "fail",
    });
  }

  const parsedProjectId = parseOptionalPositiveInt(projectId);
  const parsedPhaseId = parseOptionalPositiveInt(phaseId);
  const parsedCostCodeId = parseOptionalPositiveInt(costCodeId);

  const hasInvalidFilter = [parsedProjectId, parsedPhaseId, parsedCostCodeId].some(
    (value) => value === null
  );

  if (hasInvalidFilter) {
    return res.status(400).json({
      message: "Project, phase, and cost code filters must be positive integers.",
      data: [],
      internalStatus: "fail",
    });
  }

  const entryWhere = {};
  if (parsedProjectId !== undefined) entryWhere.project_id = parsedProjectId;
  if (parsedPhaseId !== undefined) entryWhere.phase_id = parsedPhaseId;
  if (parsedCostCodeId !== undefined) entryWhere.cost_code_id = parsedCostCodeId;

  try {
    const entries = await TimesheetEntry.findAll({
      where: entryWhere,
      include: [
        {
          model: Timesheet,
          required: true,
          where: {
            employee_id: req.userId,
            week_ending: {
              [Op.between]: [normalizedRange.from, normalizedRange.to],
            },
          },
          include: [
            {
              model: Employee,
              attributes: ["id", "first_name", "last_name", "employee_number"],
            },
          ],
        },
        {
          model: Project,
          attributes: ["id", "number", "description", "short_name"],
        },
        {
          model: Phase,
          attributes: ["id", "number", "description"],
        },
        {
          model: CostCode,
          attributes: ["id", "cost_code", "description"],
        },
      ],
      order: [[Timesheet, "week_ending", "DESC"], ["id", "ASC"]],
    });

    const result = entries.map((entry) => {
      const entryJson = entry.toJSON();
      const timesheet = entryJson.Timesheet || null;
      const employee = timesheet?.Employee || null;

      return {
        entry: {
          id: entryJson.id,
          timesheet_id: entryJson.timesheet_id,
          project_id: entryJson.project_id,
          phase_id: entryJson.phase_id,
          cost_code_id: entryJson.cost_code_id,
          row_index: entryJson.row_index,
          description: entryJson.description,
          mon_reg: entryJson.mon_reg,
          tue_reg: entryJson.tue_reg,
          wed_reg: entryJson.wed_reg,
          thu_reg: entryJson.thu_reg,
          fri_reg: entryJson.fri_reg,
          sat_reg: entryJson.sat_reg,
          sun_reg: entryJson.sun_reg,
          mon_ot: entryJson.mon_ot,
          tue_ot: entryJson.tue_ot,
          wed_ot: entryJson.wed_ot,
          thu_ot: entryJson.thu_ot,
          fri_ot: entryJson.fri_ot,
          sat_ot: entryJson.sat_ot,
          sun_ot: entryJson.sun_ot,
          total_hours: entryJson.total_hours,
          createdAt: entryJson.createdAt,
          updatedAt: entryJson.updatedAt,
        },
        timesheet: timesheet
          ? {
              id: timesheet.id,
              week_ending: timesheet.week_ending,
              employee_id: timesheet.employee_id,
              approved: timesheet.approved,
              processed: timesheet.processed,
              signed: timesheet.signed,
            }
          : null,
        employee,
        project: entryJson.Project || null,
        phase: entryJson.Phase || null,
        cost_code: entryJson.CostCode || null,
      };
    });

    return res.status(200).json({
      message: "Personal timecard analysis fetched successfully.",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error fetching personal timecard analysis:", err);
    return res.status(500).json({
      message: "Error fetching personal timecard analysis",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

exports.getPersonalExpenseEntriesReport = async (req, res) => {
  const { from, to, projectId, jobId } = req.body;

  if (!from || !to) {
    return res.status(400).json({
      message: "Both from and to dates are required.",
      data: [],
      internalStatus: "fail",
    });
  }

  const normalizedRange = normalizeDateRange(from, to);
  if (normalizedRange.error) {
    return res.status(400).json({
      message: normalizedRange.error,
      data: [],
      internalStatus: "fail",
    });
  }

  const selectedProjectId = projectId || jobId;
  const parsedProjectId = parseOptionalPositiveInt(selectedProjectId);

  if (parsedProjectId === null) {
    return res.status(400).json({
      message: "The job filter must be a positive integer.",
      data: [],
      internalStatus: "fail",
    });
  }

  const expenseEntryWhere = {};
  if (parsedProjectId !== undefined) expenseEntryWhere.project_id = parsedProjectId;

  try {
    const entries = await ExpenseEntry.findAll({
      where: expenseEntryWhere,
      include: [
        {
          model: Expense,
          required: true,
          where: {
            employee_id: req.userId,
            date_start: {
              [Op.between]: [normalizedRange.from, normalizedRange.to],
            },
          },
        },
        {
          model: Project,
          attributes: ["id", "number", "description", "short_name", "sga_flag"],
        },
      ],
      order: [[Expense, "date_start", "DESC"], ["day", "ASC"], ["id", "ASC"]],
    });

    const result = entries.map((entry) => {
      const entryJson = entry.toJSON();
      const expense = entryJson.Expense || null;
      const rowTotal = sumExpenseEntryTotals(entryJson);

      return {
        entry: {
          id: entryJson.id,
          expense_id: entryJson.expense_id,
          project_id: entryJson.project_id,
          purpose: entryJson.purpose,
          day: entryJson.day,
          destination_name: entryJson.destination_name,
          destination_cost: entryJson.destination_cost,
          lodging_cost: entryJson.lodging_cost,
          other_expense_cost: entryJson.other_expense_cost,
          car_rental_cost: entryJson.car_rental_cost,
          miles: entryJson.miles,
          miles_cost: entryJson.miles_cost,
          perdiem_cost: entryJson.perdiem_cost,
          entertainment_cost: entryJson.entertainment_cost,
          miscellaneous_description_id: entryJson.miscellaneous_description_id,
          miscellaneous_amount: entryJson.miscellaneous_amount,
          createdAt: entryJson.createdAt,
          updatedAt: entryJson.updatedAt,
          row_total: Number(rowTotal.toFixed(2)),
        },
        expense: expense
          ? {
              id: expense.id,
              employee_id: expense.employee_id,
              date_start: expense.date_start,
              num_of_days: expense.num_of_days,
              signed: expense.signed,
              approved: expense.approved,
              paid: expense.paid,
              total: expense.total,
              date_paid: expense.date_paid,
            }
          : null,
        project: entryJson.Project || null,
      };
    });

    return res.status(200).json({
      message: "Personal expense analysis fetched successfully.",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error fetching personal expense analysis:", err);
    return res.status(500).json({
      message: "Error fetching personal expense analysis",
      error: err.message,
      internalStatus: "fail",
    });
  }
};
