const { validationResult } = require("express-validator");

const { createHttpError } = require("../util/http-error");

const AUTH_COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

function assertValidRequest(req) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw createHttpError("Validation Failed", 422, errors.array());
  }
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw createHttpError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function requireNumber(value, fieldName) {
  const parsed = Number(requireString(value, fieldName));

  if (Number.isNaN(parsed)) {
    throw createHttpError(`${fieldName} must be a valid number`, 400);
  }

  return parsed;
}

function optionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function toNullableNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "Nothing"
  ) {
    return null;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw createHttpError(`${value} is not a valid number`, 400);
  }

  return parsed;
}

function toBooleanFlag(value, defaultValue = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "Nothing"
  ) {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
}

function toSignupCommand(body) {
  const password = requireString(body.password, "password");
  const confirmedPassword = body.confirmed_password;

  if (
    confirmedPassword !== undefined &&
    confirmedPassword !== null &&
    confirmedPassword !== password
  ) {
    throw createHttpError("Password confirmation does not match", 422);
  }

  return {
    email: requireString(body.email, "email").toLowerCase(),
    password,
    first_name: requireString(body.first_name, "first_name"),
    last_name: requireString(body.last_name, "last_name"),
    cell_phone: requireString(body.cell_phone, "cell_phone"),
    home_phone: optionalString(body.home_phone),
    employee_number: requireNumber(body.employee_number, "employee_number"),
    position: requireString(body.position, "position"),
    role_id: toNullableNumber(body.role_id) ?? 1,
    manager_id: toNullableNumber(body.manager_id),
    is_contractor: toBooleanFlag(body.is_contractor, false),
    is_active: toBooleanFlag(body.is_active, true),
    allow_overtime: toBooleanFlag(body.allow_overtime, false),
  };
}

function toLoginCommand(body) {
  return {
    user_name: requireString(body.user_name, "user_name"),
    password: requireString(body.password, "password"),
  };
}

function toPasswordResetRequestCommand(body) {
  return {
    email: requireString(body.email, "email").toLowerCase(),
  };
}

function toResetPasswordCommand(body) {
  const password = requireString(body.password, "password");

  if (password.length < 5) {
    throw createHttpError("Password must be at least 5 characters long", 422);
  }

  return {
    token: requireString(body.token, "token"),
    password,
  };
}

function toSignupResponse(result) {
  return {
    message: "Employee created!",
    employeeId: result.employeeId,
    status: 201,
  };
}

function toLoginResponse(result) {
  return {
    message: "Login successful",
    user: {
      ...result.user.dataValues,
      manager_name: result.managerName,
    },
    status: 200,
    expiresIn: result.expiresAt,
    totalEmployees: result.totalEmployees,
  };
}

function toCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

function toLogoutCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
  };
}

function toPasswordResetRequestResponse() {
  return {
    message: "Reset link sent to your email.",
  };
}

function toResetPasswordResponse() {
  return {
    message: "Password updated successfully.",
  };
}

function toVerifyResponse(result) {
  return {
    user: result.user,
  };
}

module.exports = {
  AUTH_COOKIE_MAX_AGE_MS,
  assertValidRequest,
  toSignupCommand,
  toLoginCommand,
  toPasswordResetRequestCommand,
  toResetPasswordCommand,
  toSignupResponse,
  toLoginResponse,
  toCookieOptions,
  toLogoutCookieOptions,
  toPasswordResetRequestResponse,
  toResetPasswordResponse,
  toVerifyResponse,
};
