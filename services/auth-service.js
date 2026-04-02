const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const authRepository = require("../repositories/auth-repository");
const { sequelize } = require("../config/db");
const { createHttpError } = require("../util/http-error");
const { sendMail } = require("../util/mailer");

function buildResetLink(resetToken) {
  return `${process.env.RESET_PASSWORD_LINK}/employee-portal/reset-password/${resetToken}`;
}

async function signup(command) {
  const existingEmployee = await authRepository.findEmployeeByEmail(command.email);

  if (existingEmployee) {
    throw createHttpError("E-Mail address already exists!", 409);
  }

  const userName = command.email.split("@")[0];
  const existingUserName = await authRepository.findEmployeeByUserName(userName);

  if (existingUserName) {
    throw createHttpError("User name already exists for this email prefix", 409);
  }

  return sequelize.transaction(async (transaction) => {
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(command.password, 12);

    const employee = await authRepository.createEmployee(
      {
        user_name: userName,
        first_name: command.first_name,
        last_name: command.last_name,
        position: command.position,
        cell_phone: command.cell_phone,
        home_phone: command.home_phone,
        email: command.email,
        employee_number: command.employee_number,
        role_id: command.role_id,
        manager_id: command.manager_id,
        is_contractor: command.is_contractor,
        is_active: command.is_active,
        allow_overtime: command.allow_overtime,
      },
      { transaction }
    );

    await authRepository.createAuthentication(
      {
        user_id: employee.id,
        password_hash: hashedPassword,
        salt,
        last_login: new Date(),
        failed_attempts: 0,
      },
      { transaction }
    );

    return {
      employeeId: employee.id,
    };
  });
}

async function login(command) {
  const user = await authRepository.findEmployeeByUserName(command.user_name);

  if (!user) {
    throw createHttpError("Invalid username or password", 401);
  }

  const auth = await authRepository.findAuthenticationByUserId(user.id);

  if (!auth) {
    throw createHttpError("Auth data not found for this user", 401);
  }

  const isEqual = await bcrypt.compare(command.password, auth.password_hash);

  if (!isEqual) {
    throw createHttpError("Invalid username or password", 401);
  }

  await authRepository.updateAuthenticationByUserId(user.id, {
    last_login: new Date(),
    failed_attempts: 0,
  });

  const totalEmployees = await authRepository.countEmployees();
  const manager = await authRepository.findManagerById(user.manager_id);

  const token = jwt.sign(
    {
      user_name: user.user_name,
      user_id: user.id.toString(),
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return {
    token,
    user,
    managerName: manager
      ? `${manager.first_name} ${manager.last_name}`
      : null,
    totalEmployees,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

async function requestPasswordReset(command) {
  const user = await authRepository.findEmployeeByEmail(command.email);

  if (!user) {
    throw createHttpError("No user found with that email.", 404);
  }

  const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  await sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Password Reset Request",
    html: `<p>You requested a password reset.</p>
           <p>Click this link to set a new password:</p>
           <a href="${buildResetLink(resetToken)}">${buildResetLink(resetToken)}</a>`,
  });

  return {
    message: "Reset link sent to your email.",
  };
}

async function resetPassword(command) {
  let decoded;

  try {
    decoded = jwt.verify(command.token, process.env.JWT_SECRET);
  } catch (error) {
    throw createHttpError("Invalid or expired token.", 400);
  }

  const user = await authRepository.findEmployeeById(decoded.userId);

  if (!user) {
    throw createHttpError("User not found.", 404);
  }

  const hashedPassword = await bcrypt.hash(command.password, 12);
  const updatedAuth = await authRepository.updateAuthenticationByUserId(user.id, {
    password_hash: hashedPassword,
  });

  if (!updatedAuth) {
    throw createHttpError("Auth data not found for this user", 404);
  }

  return {
    message: "Password updated successfully.",
  };
}

async function verifyUser(userId) {
  const user = await authRepository.findEmployeeById(userId);

  if (!user) {
    throw createHttpError("User not found.", 404);
  }

  return { user };
}

module.exports = {
  signup,
  login,
  requestPasswordReset,
  resetPassword,
  verifyUser,
};
