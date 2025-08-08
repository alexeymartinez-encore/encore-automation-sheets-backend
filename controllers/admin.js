const { sequelize } = require("../config/db");
const moment = require("moment");

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
  ExpenseFile,
} = require("../models");

// Get timesheets by week ending
exports.getTimesheetsByWeekEnding = async (req, res, next) => {
  const { weekEnding } = req.params;
  console.log("=========TIMESHEETS 1===========");

  console.log(weekEnding);
  const week_ending = moment(weekEnding).format("YYYY-MM-DD");
  console.log("=========TIMESHEETS 2===========");

  console.log(week_ending);

  try {
    // Fetch timesheets for the given weekEnding
    const timesheets = await Timesheet.findAll({
      where: {
        week_ending: week_ending, // Assuming `week_ending` matches directly
      },
      include: {
        model: Employee,
        attributes: ["id", "first_name", "last_name", "manager_id"],
      },
    });

    const result = timesheets.map((ts) => ({
      ...ts.toJSON(), // sequelize instance into JS Object and copy into new object
      first_name: ts.Employee?.first_name ?? null,
      last_name: ts.Employee?.last_name ?? null,
      manager_id: ts.Employee?.manager_id ?? null,
    }));

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

// Get Overtime report for last 2 weeks
exports.getTimesheetsOvertimeReportBiweekly = async (req, res, next) => {
  const { date } = req.params;
  const fixed_date = moment(date).format("YYYY-MM-DD");

  try {
    // Calculate the date from the previous week
    const previousWeekDate = new Date(fixed_date);
    previousWeekDate.setDate(previousWeekDate.getDate() - 7); // Subtract 7 days
    const previousWeekDateString = previousWeekDate.toISOString().split("T")[0];

    const timesheets = await Timesheet.findAll({
      where: {
        week_ending: [fixed_date, previousWeekDateString], // both weeks
      },
      include: {
        model: Employee,
        attributes: ["id", "first_name", "last_name"],
      },
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

// Get Labor Report (Employee Hours Report) for previous 2 weeks
exports.getLaborReportBiweekly = async (req, res, next) => {
  const { date } = req.params;
  const fixed_date = moment(date).format("YYYY-MM-DD");

  try {
    // Calculate the previous week date
    const previousWeekDate = new Date(fixed_date);
    previousWeekDate.setDate(previousWeekDate.getDate() - 7); // Subtract 7 days
    const previousWeekDateString = previousWeekDate.toISOString().split("T")[0];

    // Fetch timesheets for the current week with employee data
    const timesheets = await Timesheet.findAll({
      where: {
        week_ending: [fixed_date, previousWeekDateString],
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

    // Format response
    const result = timesheets.map((ts) => ({
      timesheet: {
        ...ts.toJSON(),
        employee_first_name: ts.Employee?.first_name ?? "N/A",
        employee_last_name: ts.Employee?.last_name ?? "N/A",
      },
      entries: ts.TimesheetEntries.map((entry) => ({
        ...entry.toJSON(),
        project: entry.Project?.number ?? "N/A",
        project_description: entry.Project?.description ?? "N/A",
        phase: entry.Phase?.number ?? "N/A",
        phase_description: entry.Phase?.description ?? "N/A",
        cost_code: entry.CostCode?.cost_code ?? "N/A",
        cost_code_description: entry.CostCode?.description ?? "N/A",
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

// Get Expense Report by month for each Employe
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
              // as: "Miscellaneous",
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
        project_number: entry.Project ? entry.Project.number : null,
        miscellaneous_description: entry.Miscellaneou // It's Miscellaneou because it seems the name is getting cut by an alias auto generated by db
          ? entry.Miscellaneou.description
          : null,
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

// Get Expenses for all employess by month start
exports.getExpensesByMonthStart = async (req, res, next) => {
  const { dateStart } = req.params;
  const fixed_date = moment(dateStart).format("YYYY-MM-DD");

  try {
    // Fetch timesheets for the given weekEnding
    const expenses = await Expense.findAll({
      where: {
        date_start: fixed_date, // Assuming `week_ending` matches directly
      },
      include: [
        {
          model: Employee,
          attributes: ["id", "first_name", "last_name", "manager_id"],
        },
      ],
    });

    // Attach employee details to each timesheet
    const result = expenses.map((expense) => {
      return {
        ...expense.toJSON(),
        first_name: expense.Employee?.first_name ?? null,
        last_name: expense.Employee?.last_name ?? null,
        manager_id: expense.Employee?.manager_id ?? null,
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

// Get Open timesheets
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
          attributes: [
            "id",
            "first_name",
            "last_name",
            "employee_number",
            "manager_id",
          ],
        },
      ],
    });

    // Attach employee details to each timesheet
    const result = expenses.map((expense) => {
      return {
        ...expense.toJSON(),
        first_name: expense.Employee?.first_name ?? null,
        last_name: expense.Employee?.last_name ?? null,
        manager_id: expense.Employee?.manager_id ?? null,
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

// Get Full List of Employees
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
    console.error("Error fetching timesheets:", err);
    res.status(500).json({
      message: "Error fetching timesheets",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Get full list of projects
exports.getAllProjects = async (req, res, next) => {
  try {
    // Fetch all projects without including customer data
    const projects = await Project.findAll({
      include: {
        model: Customer,
        attributes: ["id", "name", "contact"],
      },
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

// Editing Projects By Project ID
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

// Saving Timesheets Status Changes in Admin Mode
exports.saveTimesheetsStatusChanges = async (req, res, next) => {
  const timesheetData = req.body; // Array of timesheet data

  if (!Array.isArray(timesheetData) || timesheetData.length === 0) {
    return res.status(400).json({
      message: "No timesheet data provided.",
      internalStatus: "fail",
    });
  }

  const transaction = await Timesheet.sequelize.transaction();
  try {
    const updateResults = [];

    for (const timesheet of timesheetData) {
      const {
        id,
        approved,
        approved_by,
        processed,
        processed_by,
        signed,
        submitted_by,
        message,
      } = timesheet;

      if (!id) {
        throw new Error("Timesheet ID is required for updates.");
      }

      const date_processed = processed ? new Date() : null;

      const [updatedRows] = await Timesheet.update(
        {
          approved,
          approved_by,
          processed,
          processed_by,
          signed,
          message,
          date_processed,
          submitted_by,
          updatedAt: new Date(),
        },
        { where: { id }, transaction }
      );

      updateResults.push({ id, updated: updatedRows });
    }

    await transaction.commit();

    res.status(200).json({
      message: "Timesheets updated successfully.",
      data: updateResults,
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

// Saving Expenses Status Changes in Admin Mode
exports.saveExpensesStatusChanges = async (req, res, next) => {
  const expenseData = req.body;

  if (!Array.isArray(expenseData) || expenseData.length === 0) {
    return res.status(400).json({
      message: "No expense data provided.",
      data: [],
      internalStatus: "fail",
    });
  }

  const transaction = await Expense.sequelize.transaction();

  try {
    const updateResults = [];

    for (const expense of expenseData) {
      const {
        id,
        approved,
        approved_by,
        paid,
        processed_by,
        signed,
        submitted_by,
        message,
      } = expense;

      if (!id) {
        throw new Error("Expense ID is required for updates.");
      }

      const date_processed = paid ? new Date() : null;

      const [updatedRows] = await Expense.update(
        {
          approved,
          approved_by,
          paid,
          processed_by,
          signed,
          message,
          date_processed,
          submitted_by,
          updatedAt: new Date(),
        },
        { where: { id }, transaction }
      );

      updateResults.push({ id, updated: updatedRows });
    }

    await transaction.commit();

    res.status(200).json({
      message: "Expenses updated successfully.",
      data: updateResults,
      internalStatus: "success",
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error updating expenses:", err.message);
    res.status(500).json({
      message: "Error updating expenses",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Creating New Project
exports.createNewProject = async (req, res, next) => {
  const projectData = req.body; // Array of timesheet data

  if (!projectData || projectData.length === 0) {
    return res.status(400).json({
      message: "No project data provided.",
      data: [],
      internalStatus: "fail",
    });
  }

  const transaction = await Project.sequelize.transaction();

  try {
    let customerId = projectData.customer_id;
    // If no customer ID, create customer first
    if (!customerId) {
      const newCustomer = await Customer.create(
        {
          name: projectData.customer_name,
          contact: projectData.customer_contact || "",
        },
        { transaction }
      );
      customerId = newCustomer.id;
    }

    const newProject = await Project.create(
      {
        number: projectData.number,
        description: projectData.description || "",
        short_name: projectData.short_name,
        comment: projectData.comment || "",
        overtime: projectData.overtime || false,
        sga_flag: projectData.sga_flag || false,
        customer_id: customerId,
        start_date: projectData.start_date || new Date(),
        end_date: projectData.end_date || new Date(),
      },
      { transaction }
    );

    await transaction.commit();

    // Send response
    res.status(200).json({
      data: [{ project_id: newProject.id }],
      message: "Project Created Successfully.",
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error Creating Projects:", err.message);
    res.status(500).json({
      message: "Error Creating Projects",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

// Deleting Project By ID
exports.deleteProjectById = async (req, res, next) => {
  const projectId = req.params.id;

  try {
    // delete project
    const project = await Project.destroy({
      where: {
        id: projectId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({
      message: "Project Deleted Successfully",
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

// Get Employee Expenses By ID
exports.getExpenseById = async (req, res, next) => {
  const expenseId = req.params.id;

  try {
    const expenses = await Expense.findAll({
      where: {
        id: expenseId,
      },
      include: [
        {
          model: ExpenseFile,
        },
        {
          model: ExpenseEntry,
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
