const {
  Timesheet,
  Expense,
  ExpenseEntry,
  TimesheetEntry,
  Project,
  CostCode,
  Phase,
  Customer,
  Employee,
  Miscellaneous,
} = require("../models");

// Get timesheets by week ending
exports.getTimesheetsByWeekEnding = async (req, res, next) => {
  const { weekEnding } = req.params;

  try {
    // Fetch timesheets for the given weekEnding
    const timesheets = await Timesheet.findAll({
      where: {
        week_ending: weekEnding, // Assuming `week_ending` matches directly
      },
      include: [
        {
          model: Employee,
          attributes: ["first_name", "last_name"],
        },
      ],
    });

    // Attach employee details to each timesheet
    const result = timesheets.map((ts) => {
      return {
        ...ts.toJSON(),
        first_name: ts.Employee?.first_name ?? null,
        last_name: ts.Employee?.last_name ?? null,
      };
    });

    // Send the response
    res.status(200).json({
      message: "Request Successful!",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching timesheets",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Get timesheets overtime for employees
exports.getTimesheetsOvertimeReportBiweekly = async (req, res, next) => {
  const { date } = req.params;

  try {
    // Calculate the date from the previous week
    const previousWeekDate = new Date(date);
    previousWeekDate.setDate(previousWeekDate.getDate() - 7); // Subtract 7 days
    const previousWeekDateString = previousWeekDate.toISOString().split("T")[0];

    // Fetch timesheets for the given date
    const timesheets = await Timesheet.findAll({
      where: {
        week_ending: [date, previousWeekDateString],
      },
      include: [
        {
          model: Employee,
          attributes: ["first_name", "last_name"],
        },
      ],
    });

    // Attach employee details to each timesheet
    const result = timesheets.map((ts) => {
      return {
        ...ts.toJSON(),
        first_name: ts.Employee?.first_name ?? null,
        last_name: ts.Employee?.last_name ?? null,
      };
    });

    // Send the response
    res.status(200).json({
      message: "Request Successful!",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error fetching timesheets:", err);
    res.status(500).json({
      message: "Error fetching timesheets",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Get timesheets report For last 2 weeks
exports.getLaborReportBiweekly = async (req, res, next) => {
  const { date } = req.params;

  try {
    // Calculate the previous week date
    const previousWeekDate = new Date(date);
    previousWeekDate.setDate(previousWeekDate.getDate() - 7); // Subtract 7 days
    const previousWeekDateString = previousWeekDate.toISOString().split("T")[0];

    // Fetch timesheets for the current week with employee data
    const timesheets = await Timesheet.findAll({
      where: {
        week_ending: [date, previousWeekDateString],
      },
      include: [
        {
          model: Employee,
          attributes: ["id", "first_name", "last_name"],
        },
        {
          model: TimesheetEntry,
          include: [
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
        },
      ],
    });

    // Map results into expected structure
    const result = timesheets.map((ts) => ({
      timesheet: {
        ...ts.toJSON(),
        employee_first_name: ts.Employee?.first_name || "N/A",
        employee_last_name: ts.Employee?.last_name || "N/A",
      },
      entries: ts.TimesheetEntries.map((entry) => ({
        ...entry.toJSON(),
        project: entry.Project?.number || "N/A",
        project_description: entry.Project?.description || "N/A",
        phase: entry.Phase?.number || "N/A",
        phase_description: entry.Phase?.description || "N/A",
        cost_code: entry.CostCode?.cost_code || "N/A",
        cost_code_description: entry.CostCode?.description || "N/A",
      })),
    }));

    // Send the response
    res.status(200).json({
      message: "Request Successful!",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error fetching timesheets and entries:", err);
    res.status(500).json({
      message: "Error fetching timesheets and entries",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Get Report for expenses monthly
exports.getExpenseReportMonthly = async (req, res) => {
  const { date } = req.params; // Example input: "2025-08-01"

  try {
    // Fetch all Expenses for the given date, with Employee and ExpenseEntries in one shot
    const expenses = await Expense.findAll({
      where: {
        date_start: date,
      },
      include: [
        {
          model: Employee,
          attributes: [
            "id",
            "employee_number",
            "first_name",
            "last_name",
            "employee_number",
          ],
        },
        {
          model: ExpenseEntry,
          include: [
            {
              model: Project,
              attributes: ["id", "number"],
            },
            {
              model: Miscellaneous,
              attributes: ["id", "description"],
            },
          ],
          attributes: [
            "id",
            "expense_id",
            "project_id",
            "purpose",
            "day",
            "destination_name",
            "destination_cost",
            "lodging_cost",
            "other_expense_cost",
            "car_rental_cost",
            "miles",
            "miles_cost",
            "perdiem_cost",
            "entertainment_cost",
            "miscellaneous_description_id",
            "miscellaneous_amount",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
    });

    // Format results cleanly
    const result = expenses.map((expense) => ({
      expense: {
        id: expense.id,
        employee_id: expense.employee_id,
        date_start: expense.date_start,
        num_of_days: expense.num_of_days,
        signed: expense.signed,
        approved: expense.approved,
        paid: expense.paid,
        date_paid: expense.date_paid,
        total: expense.total,
        approved_by: expense.approved_by,
        processed_by: expense.processed_by,
        submitted_by: expense.submitted_by,
        message: expense.message,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      },
      employee: expense.Employee ? expense.Employee.toJSON() : null,
      expenseEntries: expense.ExpenseEntries.map((entry) => ({
        id: entry.id,
        expense_id: entry.expense_id,
        purpose: entry.purpose,
        day: entry.day,
        destination_name: entry.destination_name,
        destination_cost: entry.destination_cost,
        lodging_cost: entry.lodging_cost,
        other_expense_cost: entry.other_expense_cost,
        car_rental_cost: entry.car_rental_cost,
        miles: entry.miles,
        miles_cost: entry.miles_cost,
        perdiem_cost: entry.perdiem_cost,
        entertainment_cost: entry.entertainment_cost,
        miscellaneous_amount: entry.miscellaneous_amount,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        // Flatten project and miscellaneous info
        project_number: entry.Project?.number || null,
        miscellaneous_description: entry.Miscellaneou?.description || null,
      })),
    }));

    // Send back response
    res.status(200).json({
      message: "Expense Report with Entries fetched successfully",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error fetching expense report:", err);
    res.status(500).json({
      message: "Server error fetching expense report",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Get Expenses by month start
exports.getExpensesByMonthStart = async (req, res, next) => {
  const { dateStart } = req.params;

  try {
    // Fetch timesheets for the given weekEnding
    const expenses = await Expense.findAll({
      where: {
        date_start: dateStart, // Assuming `week_ending` matches directly
      },
      include: [
        {
          model: Employee,
          attributes: ["id", "first_name", "last_name"],
        },
      ],
    });

    // Attach employee details to each timesheet
    const result = expenses.map((expense) => {
      return {
        ...expense.toJSON(),
        first_name: expense.Employee?.first_name ?? null,
        last_name: expense.Employee?.last_name ?? null,
      };
    });

    // Send the response
    res.status(200).json({
      message: "Request Successful!",
      data: result,
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

// Get Open Expenses
exports.getOpenExpenses = async (req, res) => {
  try {
    // Fetch all signed expenses with the employee attached
    const expenses = await Expense.findAll({
      where: {
        signed: 1,
        approved: 0,
      },
      include: [
        {
          model: Employee,
          attributes: ["id", "first_name", "last_name", "employee_number"],
        },
      ],
    });

    // Format result: expense fields + employee fields merged
    const result = expenses.map((expense) => {
      const data = expense.toJSON();
      return {
        ...data,
        first_name: data.Employee?.first_name || null,
        last_name: data.Employee?.last_name || null,
        employee_number: data.Employee?.employee_number || null,
      };
    });

    res.status(200).json({
      message: "Open expenses fetched successfully",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error fetching open expenses:", err);
    res.status(500).json({
      message: "Server error fetching open expenses",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Get all belonging Employees
exports.getAllEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.findAll();
    // Send the response
    res.status(200).json({
      message: "Request Successful!",
      data: employees,
      internalStatus: "success",
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching timesheets",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Get All Projects?
exports.getAllProjects = async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      include: [
        {
          model: Customer,
          attributes: ["id", "name", "contact"],
        },
      ],
    });

    // Map over projects to append customer info
    const result = projects.map((project) => {
      return {
        ...project.toJSON(),
        customer_name: project.Customer?.name ?? "Unknown",
        customer_contact: project.Customer?.contact ?? "Unknown",
      };
    });

    // Send the response
    res.status(200).json({
      message: "Request Successful!",
      data: result,
      internalStatus: "success",
    });
  } catch (err) {
    // Log the error details
    console.error("Error fetching projects:", err);
    res.status(500).json({
      message: "Error fetching projects",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

exports.editProjectById = async (req, res, next) => {
  try {
    // Get the date parameter from the request
    const { projectId } = req.params; // Example: "2024-12-01"
    const projectData = req.body; // Array of timesheet data

    if (!projectId) {
      return res.status(400).json({
        message: "Project ID is Required",
        data: [],
        internalStatus: "fail",
      });
    }

    if (!projectData) {
      return res.status(400).json({
        message: "Project Data is Required.",
        data: [],
        internalStatus: "fail",
      });
    }
    // Fetch events where the start field is within the month
    const project = await Project.update(
      {
        number: projectData.number,
        description: projectData.description,
        short_name: projectData.short_name,
        comment: projectData.comment,
        overtime: projectData.overtime,
        sga_flag: projectData.sga_flag,
        customer_id: projectData.customer_id,
      },
      { where: { id: projectId } }
    );

    // Send the response
    return res.status(200).json({
      data: project,
      message: "Project Edited Successfully",
      internalStatus: "success",
    });
  } catch (err) {
    // Log the error details
    console.error("Error updating event:", err);
    return res.status(500).json({
      message: "Error updating event",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

exports.saveTimesheetsStatusChanges = async (req, res, next) => {
  const timesheetData = req.body; // Array of timesheet data

  try {
    if (!timesheetData || timesheetData.length === 0) {
      return res.status(400).json({ message: "No timesheet data provided." });
    }

    // Iterate over the array and perform updates
    const updatePromises = timesheetData.map(async (timesheet) => {
      const {
        id, // The ID of the timesheet to update
        approved,
        approved_by,
        processed,
        processed_by,
        signed,
        submitted_by,
        message,
      } = timesheet;

      // Ensure an ID is provided for the update
      if (!id) {
        throw new Error("Timesheet ID is required for updates.");
      }

      const date_processed = processed ? new Date() : null;

      // Perform the update
      return Timesheet.update(
        {
          approved,
          approved_by,
          processed,
          processed_by,
          signed,
          message,
          date_processed,
          submitted_by,
          updatedAt: new Date(), // Auto-update `updatedAt` timestamp
        },
        { where: { id } }
      );
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Send response
    res.status(200).json({
      data: [],
      message: "Timesheets updated successfully.",
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error updating timesheets:", err.message);
    res.status(500).json({
      message: "Error updating timesheets",
      error: err.message,
      internalStatus: "success",
    });
  }
};

exports.saveExpensesStatusChanges = async (req, res, next) => {
  const expenseData = req.body; // Array of timesheet data
  try {
    if (!expenseData || expenseData.length === 0) {
      return res.status(400).json({
        message: "No timesheet data provided.",
        data: [],
        internalStatus: "fail",
      });
    }

    // Iterate over the array and perform updates
    const updatePromises = expenseData.map(async (expense) => {
      const {
        id, // The ID of the timesheet to update
        approved,
        approved_by,
        paid,
        processed_by,
        signed,
        submitted_by,
        message,
      } = expense;

      // Ensure an ID is provided for the update
      if (!id) {
        throw new Error("Timesheet ID is required for updates.");
      }

      const date_processed = paid ? new Date() : null;

      // Perform the update
      return Expense.update(
        {
          approved,
          approved_by,
          paid,
          processed_by,
          signed,
          message,
          date_processed,
          submitted_by,
          updatedAt: new Date(), // Auto-update `updatedAt` timestamp
        },
        { where: { id } }
      );
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Send response
    res.status(200).json({
      data: [],
      message: "Expenses updated successfully.",
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error updating Expenses:", err.message);
    res.status(500).json({
      message: "Error updating Expenses",
      error: err.message,
      internalStatus: "fail",
    });
  }
};
