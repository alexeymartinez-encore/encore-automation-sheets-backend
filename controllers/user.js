const jwt = require("jsonwebtoken");
const Employee = require("../models/employee");

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
  // console.log("HELLLOOOOO");
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
