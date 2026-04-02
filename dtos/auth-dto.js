const { validationResult } = require("express-validator");

const { createHttpError } = require("../util/http-error");

const ACCESS_COOKIE_NAME = "token";
const REFRESH_COOKIE_NAME = "refresh_token";
const CSRF_COOKIE_NAME = "csrf_token";

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const IDLE_WARNING_WINDOW_MS = 2 * 60 * 1000;

function isProductionEnvironment() {
  const normalized = String(process.env.NODE_ENV || "").toLowerCase();
  return normalized === "production" || normalized === "prod";
}

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

function toUserPayload(user) {
  if (!user) {
    return null;
  }

  const source = user.dataValues ? user.dataValues : user;

  return {
    id: source.id,
    user_id: source.id,
    employee_number: source.employee_number,
    user_name: source.user_name,
    first_name: source.first_name,
    last_name: source.last_name,
    manager_id: source.manager_id,
    position: source.position,
    cell_phone: source.cell_phone,
    home_phone: source.home_phone,
    email: source.email,
    role_id: source.role_id,
    is_contractor: source.is_contractor,
    is_active: source.is_active,
    allow_overtime: source.allow_overtime,
    manager_name: source.manager_name || null,
  };
}

function toSessionPayload(session) {
  if (!session) {
    return null;
  }

  return {
    access_expires_at: session.accessExpiresAt,
    idle_expires_at: session.idleExpiresAt,
    absolute_expires_at: session.absoluteExpiresAt,
    warning_starts_at: session.warningStartsAt,
    server_time: session.serverTime,
  };
}

function toLoginResponse(result) {
  return {
    message: "Login successful",
    user: toUserPayload(result.user),
    session: toSessionPayload(result.session),
    status: 200,
    totalEmployees: result.totalEmployees,
  };
}

function toRefreshResponse(result) {
  return {
    message: "Session refreshed",
    user: toUserPayload(result.user),
    session: toSessionPayload(result.session),
    status: 200,
  };
}

function toVerifyResponse(result) {
  return {
    user: toUserPayload(result.user),
    session: toSessionPayload(result.session),
    totalEmployees: result.totalEmployees ?? null,
  };
}

function toAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "Lax",
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: "/",
  };
}

function toRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "Lax",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/",
  };
}

function toCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: isProductionEnvironment(),
    sameSite: "Lax",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/",
  };
}

function toLogoutCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "Lax",
    path: "/",
  };
}

function toLogoutCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: isProductionEnvironment(),
    sameSite: "Lax",
    path: "/",
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

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_SESSION_MAX_AGE_MS,
  IDLE_WARNING_WINDOW_MS,
  isProductionEnvironment,
  assertValidRequest,
  toSignupCommand,
  toLoginCommand,
  toPasswordResetRequestCommand,
  toResetPasswordCommand,
  toSignupResponse,
  toLoginResponse,
  toRefreshResponse,
  toVerifyResponse,
  toAccessCookieOptions,
  toRefreshCookieOptions,
  toCsrfCookieOptions,
  toLogoutCookieOptions,
  toLogoutCsrfCookieOptions,
  toPasswordResetRequestResponse,
  toResetPasswordResponse,
};
