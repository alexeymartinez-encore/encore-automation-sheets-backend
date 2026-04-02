const Timesheet = require("../models/timesheet");
const TimesheetEntry = require("../models/timesheet_entry");
const Employee = require("../models/employee");
const { sequelize } = require("../config/db"); // Import the Sequelize instance

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

async function getAuthorizedTimesheetForActor(req, timesheetId, transaction = null) {
  const parsedTimesheetId = Number(timesheetId);
  if (!Number.isInteger(parsedTimesheetId) || parsedTimesheetId <= 0) {
    return {
      error: {
        statusCode: 400,
        message: "A valid timesheet ID is required.",
      },
    };
  }

  const timesheet = await Timesheet.findByPk(parsedTimesheetId, {
    attributes: ["id", "employee_id"],
    ...(transaction ? { transaction } : {}),
  });

  if (!timesheet) {
    return {
      error: {
        statusCode: 404,
        message: "Timesheet not found.",
      },
    };
  }

  const { actorUserId, actorRoleId } = getActorContext(req);
  const employeeId = Number(timesheet.employee_id);
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
        message: "You are not authorized to access this timesheet.",
      },
    };
  }

  return { timesheet };
}

exports.getTimesheetsByUserId = async (req, res, next) => {
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
        "You are not authorized to view this user's details"
      );
      error.statusCode = 403;
      return next(error);
    }

    const timesheets = await Timesheet.findAll({
      where: {
        employee_id: userId,
      },
    });

    res.status(200).json({
      message: "Timesheet Fetched!",
      data: timesheets,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getMyTimesheets = async (req, res, next) => {
  const userId = String(req.userId);

  try {
    const timesheets = await Timesheet.findAll({
      where: {
        employee_id: userId,
      },
    });

    res.status(200).json({
      message: "Timesheet Fetched!",
      data: timesheets,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getTimesheetEntriesByTimesheetId = async (req, res, next) => {
  const timesheetId = req.params.id;

  try {
    const { error } = await getAuthorizedTimesheetForActor(req, timesheetId);
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

    const timesheetEntries = await TimesheetEntry.findAll({
      where: {
        timesheet_id: timesheetId,
      },
    });

    res.status(200).json({
      message: "Timesheet Entries Fetched Successfully!",
      data: timesheetEntries,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.editTimesheetEntries = async (req, res, next) => {
  try {
    const { timesheetId, entries } = req.body;

    if (!timesheetId || !entries) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const { error } = await getAuthorizedTimesheetForActor(req, timesheetId);
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

    const savedEntries = await Promise.all(
      entries.map(async (entry) => {
        const {
          id,
          project_id,
          phase_id,
          cost_code_id,
          row_index,
          description,
          mon_reg,
          tue_reg,
          wed_reg,
          thu_reg,
          fri_reg,
          sat_reg,
          sun_reg,
          mon_ot,
          tue_ot,
          wed_ot,
          thu_ot,
          fri_ot,
          sat_ot,
          sun_ot,
          total_hours,
        } = entry;

        // Find an existing entry by timesheet_id and row_index
        const existingEntry = await TimesheetEntry.findOne({
          where: { timesheet_id: timesheetId, id: id },
        });

        let savedEntry;
        if (existingEntry) {
          // If the entry exists, update it
          savedEntry = await existingEntry.update({
            project_id: project_id,
            phase_id: phase_id,
            cost_code_id: cost_code_id,
            description: description,
            mon_reg: mon_reg || 0,
            tue_reg: tue_reg || 0,
            wed_reg: wed_reg || 0,
            thu_reg: thu_reg || 0,
            fri_reg: fri_reg || 0,
            sat_reg: sat_reg || 0,
            sun_reg: sun_reg || 0,
            mon_ot: mon_ot || 0,
            tue_ot: tue_ot || 0,
            wed_ot: wed_ot || 0,
            thu_ot: thu_ot || 0,
            fri_ot: fri_ot || 0,
            sat_ot: sat_ot || 0,
            sun_ot: sun_ot || 0,
            total_hours: total_hours || 0,
          });
        } else {
          // If no entry exists, create a new one
          savedEntry = await TimesheetEntry.create({
            timesheet_id: timesheetId,
            project_id: project_id,
            phase_id: phase_id,
            cost_code_id: cost_code_id,
            row_index: row_index,
            description: description,
            mon_reg: mon_reg || 0,
            tue_reg: tue_reg || 0,
            wed_reg: wed_reg || 0,
            thu_reg: thu_reg || 0,
            fri_reg: fri_reg || 0,
            sat_reg: sat_reg || 0,
            sun_reg: sun_reg || 0,
            mon_ot: mon_ot || 0,
            tue_ot: tue_ot || 0,
            wed_ot: wed_ot || 0,
            thu_ot: thu_ot || 0,
            fri_ot: fri_ot || 0,
            sat_ot: sat_ot || 0,
            sun_ot: sun_ot || 0,
            total_hours: total_hours || 0,
          });
        }

        return savedEntry;
      })
    );

    return res.status(200).json({
      message: "Timesheet Saved Successfully",
      data: savedEntries,
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error saving timesheet entries:", error);
    return res.status(500).json({
      message: "Failed to save timesheet entries",
      error: error.message,
    });
  }
};

// Delete Timesheet Entry By Id
exports.deleteTimesheetEntryById = async (req, res, next) => {
  const timesheetEntryId = req.params.id;

  try {
    const parsedEntryId = Number(timesheetEntryId);
    if (!Number.isInteger(parsedEntryId) || parsedEntryId <= 0) {
      return res.status(400).json({
        message: "A valid timesheet entry ID is required.",
        data: [],
        internalStatus: "fail",
      });
    }

    const existingEntry = await TimesheetEntry.findByPk(parsedEntryId, {
      attributes: ["id", "timesheet_id"],
    });

    if (!existingEntry) {
      return res.status(404).json({
        message: "Timesheet entry not found.",
        data: [],
        internalStatus: "fail",
      });
    }

    const { error } = await getAuthorizedTimesheetForActor(
      req,
      existingEntry.timesheet_id
    );
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

    const timesheetEntry = await TimesheetEntry.destroy({
      where: {
        id: parsedEntryId,
      },
    });

    if (!timesheetEntry) {
      return res.status(404).json({
        message: "Timesheet entry not found.",
        data: [],
        internalStatus: "fail",
      });
    }

    res.status(200).json({
      message: "Timesheet Entry Deleted Successfully",
      data: timesheetEntry,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteTimesheetById = async (req, res, next) => {
  const timesheetId = req.params.id;

  try {
    const { error } = await getAuthorizedTimesheetForActor(req, timesheetId);
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

    // Delete all entries associated with this timesheet
    await TimesheetEntry.destroy({
      where: {
        timesheet_id: timesheetId,
      },
    });

    // Then delete the timesheet itself
    const timesheet = await Timesheet.destroy({
      where: {
        id: timesheetId,
      },
    });

    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    res.status(200).json({
      message: "Timesheet Deleted Successfully",
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

// Works both for creating or editing
exports.saveTimesheet = async (req, res, next) => {
  const {
    timesheetData, // Timesheet data
    timesheetEntryData, // Array of timesheet entries
  } = req.body;
  const actorUserId = Number(req.userId);
  const actorRoleId = Number(req.userRoleId || ROLE_EMPLOYEE);

  if (!timesheetData || typeof timesheetData !== "object") {
    return res.status(400).json({
      message: "Timesheet payload is required.",
      data: [],
      internalStatus: "fail",
    });
  }

  if (actorRoleId <= ROLE_EMPLOYEE) {
    timesheetData.employee_id = actorUserId;
  } else if (!timesheetData.employee_id) {
    timesheetData.employee_id = actorUserId;
  }

  const requestedEmployeeId = Number(timesheetData.employee_id);
  if (!Number.isInteger(requestedEmployeeId) || requestedEmployeeId <= 0) {
    return res.status(400).json({
      message: "A valid employee_id is required.",
      data: [],
      internalStatus: "fail",
    });
  }

  timesheetData.employee_id = requestedEmployeeId;

  if (actorRoleId === ROLE_EMPLOYEE && requestedEmployeeId !== actorUserId) {
    return res.status(403).json({
      message: "You can only create timesheets for yourself.",
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
    });

    if (!managedEmployee) {
      return res.status(403).json({
        message: "You can only create timesheets for your employees.",
        data: [],
        internalStatus: "fail",
      });
    }
  }

  const t = await sequelize.transaction(); // Start transaction

  try {
    let savedTimesheet;

    if (timesheetData.id) {
      const existingTimesheet = await Timesheet.findByPk(timesheetData.id, {
        transaction: t,
      });

      if (!existingTimesheet) {
        await t.rollback();
        return res.status(404).json({
          message: "Timesheet not found.",
          data: [],
          internalStatus: "fail",
        });
      }

      const existingEmployeeId = Number(existingTimesheet.employee_id);

      if (actorRoleId === ROLE_EMPLOYEE && existingEmployeeId !== actorUserId) {
        await t.rollback();
        return res.status(403).json({
          message: "You are not authorized to edit this timesheet.",
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
            message: "You are not authorized to edit this timesheet.",
            data: [],
            internalStatus: "fail",
          });
        }
      }

      if (actorRoleId < ROLE_ADMIN && requestedEmployeeId !== existingEmployeeId) {
        await t.rollback();
        return res.status(403).json({
          message:
            "You cannot move an existing timesheet to a different employee.",
          data: [],
          internalStatus: "fail",
        });
      }

      if (actorRoleId < ROLE_ADMIN) {
        timesheetData.employee_id = existingEmployeeId;
      }
    }

    // Check if a timesheet with the same week_ending already exists for the employee
    if (!timesheetData.id) {
      const existingTimesheet = await Timesheet.findOne({
        where: {
          employee_id: timesheetData.employee_id,
          week_ending: timesheetData.week_ending,
        },
        transaction: t,
      });

      if (existingTimesheet) {
        await t.rollback();

        return res.status(200).json({
          message: "Timesheet Already Exists (Existing Date)",
          data: { timesheet: [], entries: [] },
          internalStatus: "fail",
        });
      }
    }

    // Save or update timesheet
    if (timesheetData.id) {
      savedTimesheet = await Timesheet.update(
        {
          employee_id: timesheetData.employee_id,
          week_ending: timesheetData.week_ending,
          total_reg_hours: timesheetData.total_reg_hours,
          total_overtime: timesheetData.total_overtime,
          approved: timesheetData.approved || false,
          signed: timesheetData.signed || false,
          processed: timesheetData.processed || false,
          approved_by: timesheetData.approved_by || "None",
          processed_by: timesheetData.processed_by || "None",
          submitted_by: timesheetData.submitted_by || "None",
          message: timesheetData.message || "None",
        },
        { where: { id: timesheetData.id }, transaction: t }
      );
    } else {
      savedTimesheet = await Timesheet.create(
        {
          employee_id: timesheetData.employee_id,
          week_ending: timesheetData.week_ending,
          total_reg_hours: timesheetData.total_reg_hours,
          total_overtime: timesheetData.total_overtime,
          approved: timesheetData.approved || false,
          signed: timesheetData.signed || false,
          processed: timesheetData.processed || false,
          approved_by: timesheetData.approved_by || "None",
          processed_by: timesheetData.processed_by || "None",
          submitted_by: timesheetData.submitted_by || "None",
          message: timesheetData.message || "None",
        },
        { transaction: t }
      );
    }

    const savedEntries = await Promise.all(
      timesheetEntryData.map(async (entry) => {
        if (entry.id) {
          // If entry has an ID, attempt to update it
          const existingEntry = await TimesheetEntry.findOne({
            where: { id: entry.id },
            transaction: t,
          });

          if (!existingEntry) {
            throw new Error(`Timesheet entry with ID ${entry.id} not found`);
          }

          return await existingEntry.update(
            {
              project_id: entry.project_id,
              phase_id: entry.phase_id,
              cost_code_id: entry.cost_code_id,
              row_index: entry.row_index,
              description: entry.description,
              mon_reg: entry.mon_reg || 0,
              tue_reg: entry.tue_reg || 0,
              wed_reg: entry.wed_reg || 0,
              thu_reg: entry.thu_reg || 0,
              fri_reg: entry.fri_reg || 0,
              sat_reg: entry.sat_reg || 0,
              sun_reg: entry.sun_reg || 0,
              mon_ot: entry.mon_ot || 0,
              tue_ot: entry.tue_ot || 0,
              wed_ot: entry.wed_ot || 0,
              thu_ot: entry.thu_ot || 0,
              fri_ot: entry.fri_ot || 0,
              sat_ot: entry.sat_ot || 0,
              sun_ot: entry.sun_ot || 0,
              total_hours: entry.total_hours || 0,
            },
            { transaction: t }
          );
        } else {
          // If no ID, it's a new entry, so create it
          return await TimesheetEntry.create(
            {
              timesheet_id: savedTimesheet.id || timesheetData.id,
              project_id: entry.project_id,
              phase_id: entry.phase_id,
              cost_code_id: entry.cost_code_id,
              row_index: entry.row_index,
              description: entry.description,
              mon_reg: entry.mon_reg || 0,
              tue_reg: entry.tue_reg || 0,
              wed_reg: entry.wed_reg || 0,
              thu_reg: entry.thu_reg || 0,
              fri_reg: entry.fri_reg || 0,
              sat_reg: entry.sat_reg || 0,
              sun_reg: entry.sun_reg || 0,
              mon_ot: entry.mon_ot || 0,
              tue_ot: entry.tue_ot || 0,
              wed_ot: entry.wed_ot || 0,
              thu_ot: entry.thu_ot || 0,
              fri_ot: entry.fri_ot || 0,
              sat_ot: entry.sat_ot || 0,
              sun_ot: entry.sun_ot || 0,
              total_hours: entry.total_hours || 0,
            },
            { transaction: t }
          );
        }
      })
    );

    // Commit the transaction
    await t.commit();

    res.status(200).json({
      message: "Timesheet Saved Successfully",
      data: { timesheet: savedTimesheet, entries: savedEntries },
      internalStatus: "success",
    });
  } catch (error) {
    await t.rollback(); // Rollback transaction if any error occurs
    console.error("Error saving timesheet and entries: ", error);
    return res.status(500).json({
      message: "Error saving timesheet and entries",
      error: error.message,
      internalStatus: "success",
    });
  }
};

exports.signTimesheetById = async (req, res, next) => {
  const timesheetIdParams = Number(req.params.id);
  const { timesheet_id, signed, signed_by } = req.body;
  const bodyTimesheetId = Number(timesheet_id);

  if (
    !Number.isInteger(timesheetIdParams) ||
    !Number.isInteger(bodyTimesheetId) ||
    timesheetIdParams !== bodyTimesheetId
  ) {
    const error = new Error(
      "Timesheet Id in request param does not match the one in request body body"
    );
    error.statusCode = 400; //Bad Request
    return next(error);
  }

  try {
    const { error } = await getAuthorizedTimesheetForActor(req, timesheetIdParams);
    if (error) {
      return res.status(error.statusCode).json({
        message: error.message,
        data: [],
        internalStatus: "fail",
      });
    }

    const timesheet = await Timesheet.findOne({
      where: {
        id: bodyTimesheetId,
      },
    });

    if (!timesheet) {
      return res.status(404).json({
        message: "Timesheet not found.",
        data: [],
        internalStatus: "fail",
      });
    }

    timesheet.update({
      signed: signed,
      submitted_by: signed_by,
    });

    res.status(200).json({
      message: "Timesheet signed successfully",
      data: timesheet,
      internalStatus: "success",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
