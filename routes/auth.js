const express = require("express");
const { body } = require("express-validator");

const Employee = require("../models/employee");
const authController = require("../controllers/auth");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

// Employee Signup  Route
router.put(
  "/signup",
  [
    body("email")
      .isEmail()
      .withMessage("Please Enter a Valid Email")
      .custom((value, { req }) => {
        return Employee.findOne({ where: { email: value } }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("E-Mail address already exists!");
          }
        });
      }),
    body("password").trim().isLength({ min: 5 }),
    body("first_name")
      .trim()
      .not()
      .isEmpty()
      .withMessage("First name is required")
      .isAlpha()
      .withMessage("First name must contain only letters"),
    body("last_name")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Last name is required"),
    body("cell_phone")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Cell phone is required"),
    // .matches(/^\d{10}$/)
    // .withMessage("Cell phone number must be 10 digits"),
    body("employee_number")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Employee number is required")
      .isInt()
      .withMessage("Employee number must be an integer"),
    body("position").trim().not().isEmpty().withMessage("Position is required"),
  ],
  authController.signup
);

router.post("/login", authController.login);
router.post("/logout", isAuth, authController.logout);
router.post("/request-reset", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);
router.get("/verify", isAuth, authController.verifyMe);

module.exports = router;
