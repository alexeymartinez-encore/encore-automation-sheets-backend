const Project = require("../models/project"); // Assuming you have the Project model already defined
const Phase = require("../models/phase"); // Assuming you have the Project model already defined
const CostCode = require("../models/cost_code");
const Miscellaneous = require("../models/miscellaneous");
const Customer = require("../models/customer");

exports.getAllProjects = async (req, res, next) => {
  try {
    // Fetch all projects from the Project table
    const projects = await Project.findAll({
      where: { is_active: true },
    });

    // Return the fetched projects in the response
    res.status(200).json({
      success: true,
      data: projects,
      internalStatus: "success",
      message: "Projects Fetched Successfully",
    });
  } catch (error) {
    // Handle any errors that occur during the query
    res.status(500).json({
      success: false,
      message: "Failed to retrieve projects",
      error: error.message,
      data: [],
    });
  }
};

exports.getAllPhases = async (req, res, next) => {
  try {
    // Fetch all projects from the Project table
    const phases = await Phase.findAll();

    // Return the fetched projects in the response
    res.status(200).json({
      message: "Phases Fetched Successfully",
      success: true,
      data: phases,
      internalStatus: "success",
    });
  } catch (error) {
    // Handle any errors that occur during the query
    res.status(500).json({
      success: false,
      message: "Failed to retrieve phases",
      error: error.message,
      internalStatus: "success",
    });
  }
};

exports.getAllCostCodes = async (req, res, next) => {
  try {
    // Fetch all projects from the Project table
    const costCodes = await CostCode.findAll();

    // Return the fetched projects in the response
    res.status(200).json({
      success: true,
      data: costCodes,
      message: "Cost Codes Fetched Successfully",
      internalStatus: "success",
    });
  } catch (error) {
    // Handle any errors that occur during the query
    res.status(500).json({
      success: false,
      message: "Failed to retrieve cost codes",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.getAllMisc = async (req, res, next) => {
  try {
    // Fetch all projects from the Project table
    const miscellaneous = await Miscellaneous.findAll();

    // Return the fetched projects in the response
    res.status(200).json({
      success: true,
      data: miscellaneous,
      message: "Miscellaneous Fetched Successfully",
      internalStatus: "success",
    });
  } catch (error) {
    // Handle any errors that occur during the query
    res.status(500).json({
      success: false,
      message: "Failed to retrieve miscellaneous codes",
      error: error.message,
    });
  }
};

exports.getAllCustomers = async (req, res, next) => {
  try {
    // Fetch all projects from the Project table
    const customers = await Customer.findAll();

    // Return the fetched projects in the response
    res.status(200).json({
      success: true,
      data: customers,
      message: "Customers Fetched Successfully",
      internalStatus: "success",
    });
  } catch (error) {
    // Handle any errors that occur during the query
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Customers",
      error: error.message,
    });
  }
};
