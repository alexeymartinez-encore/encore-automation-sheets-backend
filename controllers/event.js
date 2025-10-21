const { Event, Employee } = require("../models");
const { sequelize } = require("../config/db"); // Import the Sequelize instance

// Get timesheets by week ending
exports.saveEvent = async (req, res, next) => {
  try {
    const {
      id,
      employee_id,
      start,
      end_date,
      long_description = "",
      back_color_id = null,
      fore_color_id = null,
      title,
      formatted_month,
    } = req.body;

    // Validate required fields
    if (!employee_id || !start || !end_date || !title) {
      return res.status(400).json({
        message: "Missing required fields: employee_id, start, end, title.",
        data: [],
        internalStatus: "fail",
      });
    }

    // if id not provided create a new event
    if (!id) {
      await Event.create({
        employee_id,
        start: start,
        end_date: end_date,
        long_description,
        back_color_id,
        fore_color_id,
        title,
        formatted_month,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return res.status(200).json({
        data: [],
        message: "Event created successfully.",
        internalStatus: "success",
      });
    }

    // Update existing event
    const [updatedRows] = await Event.update(
      {
        employee_id,
        start,
        end_date,
        long_description,
        back_color_id,
        fore_color_id,
        title,
        formatted_month,
      },
      { where: { id } }
    );

    if (updatedRows === 0) {
      return res.status(404).json({
        message: "Event not found or no changes made.",
        data: [],
        internalStatus: "error",
      });
    }

    // Send response
    return res.status(200).json({
      data: [],
      message: "Event updated successfully.",
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error saving event:", err.message);
    return res.status(500).json({
      message: "Error saving event",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

exports.fetchEventsByMonth = async (req, res, next) => {
  try {
    const { date } = req.params; // Example: "2024-12-01"
    if (!date) {
      return res.status(400).json({
        message: "Date parameter is required.",
        data: [],
        internalStatus: "fail",
      });
    }

    const events = await Event.findAll({
      where: { formatted_month: date },
      raw: false,
      attributes: [
        "id",
        "employee_id",
        [sequelize.literal("CONVERT(VARCHAR, start, 120)"), "start"],
        [sequelize.literal("CONVERT(VARCHAR, end_date, 120)"), "end_date"],
        "title",
        "formatted_month",
        "long_description",
        "back_color_id",
        "fore_color_id",
        "createdAt",
        "updatedAt",
      ],
      include: {
        model: Employee,
        attributes: ["first_name", "last_name"],
      },
    });

    return res.status(200).json({
      data: events,
      message: "Events fetched successfully",
      internalStatus: "success",
    });
  } catch (err) {
    console.error("Error fetching events:", err);
    return res.status(500).json({
      message: "Error fetching events",
      error: err.message,
      internalStatus: "fail",
    });
  }
};

exports.editEventById = async (req, res, next) => {
  try {
    // Get the date parameter from the request
    const { eventId } = req.params; // Example: "2024-12-01"
    const eventData = req.body; // Array of timesheet data

    if (!eventId) {
      return res.status(400).json({
        message: "Event does not exist",
        data: [],
        internalStatus: "fail",
      });
    }

    if (!eventData) {
      return res.status(400).json({
        message: "Event Data is Required.",
        data: [],
        internalStatus: "fail",
      });
    }
    // Fetch events where the start field is within the month
    const event = await Event.update(
      {
        employee_id: eventData.employee_id,
        start: eventData.start,
        end_date: eventData.end_date,
        title: eventData.title,
        long_description: eventData.long_description,
        back_color_id: eventData.back_color_id,
        fore_color_id: eventData.fore_color_id,
      },
      { where: { id: eventId } }
    );

    // Send the response
    return res.status(200).json({
      data: event,
      message: "Event Edited successfully",
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

exports.deleteEventById = async (req, res, next) => {
  try {
    // Get the date parameter from the request
    const { eventId } = req.params; // Example: "2024-12-01"

    if (!eventId) {
      return res.status(400).json({
        message: "Event does not exist",
        data: [],
        internalStatus: "fail",
      });
    }

    const deleteEvent = await Event.destroy({
      where: {
        id: eventId,
      },
    });

    // Send the response
    return res.status(200).json({
      data: [{ deleteEvent }],
      message: "Event deleted successfully",
      internalStatus: "success",
    });
  } catch (err) {
    // Log the error details
    console.error("Error fetching events:", err);
    return res.status(500).json({
      message: "Error fetching events",
      error: err.message,
      internalStatus: "fail",
    });
  }
};
