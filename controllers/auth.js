const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const Employee = require("../models/employee");
const Authentication = require("../models/authentication");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // Intermedia SMTP server
  port: 587, // Port you mentioned for SMTP
  secure: false, // Port 25 uses STARTTLS, so secure is false
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Employee Signup
exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const {
    email,
    password,
    first_name,
    last_name,
    cell_phone,
    home_phone,
    employee_number,
    position,
    role_id,
    manager_id,
    is_contractor,
    is_active,
    allow_overtime,
  } = req.body;

  // generate a random salt using crypto
  const salt = crypto.randomBytes(16).toString("hex");

  try {
    const hashedPw = await bcrypt.hash(password, 12);
    const employee = await Employee.create({
      user_name: email.split("@")[0],
      first_name,
      last_name,
      position,
      cell_phone,
      home_phone,
      email,
      employee_number,
      role_id,
      manager_id: manager_id || null,
      is_contractor,
      is_active,
      allow_overtime,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const auth = await Authentication.create({
      user_id: employee.id,
      password_hash: hashedPw,
      salt,
      last_login: new Date(),
      failed_attempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Employee created!",
      employeeId: auth.user_id,
      status: 201,
    });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

// Employee Login
exports.login = async (req, res, next) => {
  const { user_name, password } = req.body;

  try {
    // Find User
    const user = await Employee.findOne({ where: { user_name } });
    console.log(user);
    if (!user) throw new Error("A user with this user_name could not be found");

    // Find Auth data for user
    const auth = await Authentication.findOne({ where: { user_id: user.id } });
    if (!auth) throw new Error("Auth data not found for this user");

    // match data
    const isEqual = await bcrypt.compare(password, auth.password_hash);
    if (!isEqual) throw new Error("Wrong Password!");

    const totalEmployees = await Employee.count();

    const manager = user.manager_id
      ? await Employee.findByPk(user.manager_id, {
          attributes: ["first_name", "last_name"],
        })
      : null;

    const expiresIn = "1h";
    const token = jwt.sign(
      {
        user_name: user.user_name,
        user_id: user.id.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: "Login successful",
        user: {
          ...user.dataValues,
          manager_name: manager
            ? `${manager.first_name} ${manager.last_name}`
            : null,
        },
        status: 200,
        expiresIn: Date.now() + 60 * 60 * 1000,
        totalEmployees,
      });
  } catch (err) {
    err.statusCode = err.statusCode || 401;
    next(err);
  }
};

// Employee Logout
exports.logout = (req, res, next) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax", // Strict, Lax, or None
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// Request Password Reset
exports.requestPasswordReset = async (req, res, next) => {
  const email = req.body.email;

  const user = await Employee.findOne({ where: { email } });

  if (!user) {
    return res.status(404).json({ message: "No user found with that email." });
  }

  // Generate a token (for simplicity, using JWT, but could also use crypto.randomBytes)
  const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  //  Email this link to user
  const resetLink = `${process.env.RESET_PASSWORD_LINK}/employee-portal/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Password Reset Request",
    html: `<p>You requested a password reset.</p>
           <p>Click this link to set a new password:</p>
           <a href="${resetLink}">${resetLink}</a>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ message: "Failed to send reset email." });
    } else {
      return res
        .status(200)
        .json({ message: "Reset link sent to your email." });
    }
  });

  res.status(200).json({ message: "Reset link sent." });
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }

  const user = await Employee.findByPk(decoded.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const hashedPw = await bcrypt.hash(password, 12);

  await Authentication.update(
    { password_hash: hashedPw },
    { where: { user_id: user.id } }
  );

  res.status(200).json({ message: "Password updated successfully." });
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }

  const user = await Employee.findByPk(decoded.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const hashedPw = await bcrypt.hash(password, 12);

  await Authentication.update(
    { password_hash: hashedPw },
    { where: { user_id: user.id } }
  );

  res.status(200).json({ message: "Password updated successfully." });
};

// Verify Employee
exports.verifyMe = async (req, res, next) => {
  const user = await Employee.findByPk(req.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  res.status(200).json({ user });
};
