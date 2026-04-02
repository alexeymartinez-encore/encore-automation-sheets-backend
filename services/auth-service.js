const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const authDto = require("../dtos/auth-dto");
const authRepository = require("../repositories/auth-repository");
const { sequelize } = require("../config/db");
const { createHttpError } = require("../util/http-error");
const { sendMail } = require("../util/mailer");

function buildResetLink(resetToken) {
  return `${process.env.RESET_PASSWORD_LINK}/employee-portal/reset-password/${resetToken}`;
}

function createAccessToken(user, sessionId) {
  const expiresInSeconds = Math.floor(authDto.ACCESS_TOKEN_MAX_AGE_MS / 1000);

  return jwt.sign(
    {
      user_name: user.user_name,
      user_id: user.id.toString(),
      role_id: user.role_id,
      sid: sessionId,
      type: "access",
    },
    process.env.JWT_SECRET,
    { expiresIn: expiresInSeconds }
  );
}

function createRefreshToken(userId, sessionId) {
  const expiresInSeconds = Math.floor(authDto.REFRESH_TOKEN_MAX_AGE_MS / 1000);

  return jwt.sign(
    {
      user_id: userId.toString(),
      sid: sessionId,
      type: "refresh",
    },
    process.env.JWT_SECRET,
    { expiresIn: expiresInSeconds }
  );
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function computeSessionExpiryWindow(nowDate = new Date()) {
  const nowMs = nowDate.getTime();
  const absoluteMs = nowMs + authDto.ABSOLUTE_SESSION_MAX_AGE_MS;
  const idleMs = Math.min(nowMs + authDto.IDLE_TIMEOUT_MS, absoluteMs);
  const refreshMs = nowMs + authDto.REFRESH_TOKEN_MAX_AGE_MS;

  return {
    absoluteExpiresAt: new Date(absoluteMs),
    idleExpiresAt: new Date(idleMs),
    refreshExpiresAt: new Date(refreshMs),
  };
}

function isSessionExpired(session, nowDate = new Date()) {
  if (!session) {
    return true;
  }

  const nowMs = nowDate.getTime();
  if (session.revoked_at) {
    return true;
  }

  if (nowMs >= new Date(session.refresh_expires_at).getTime()) {
    return true;
  }

  if (nowMs >= new Date(session.idle_expires_at).getTime()) {
    return true;
  }

  if (nowMs >= new Date(session.absolute_expires_at).getTime()) {
    return true;
  }

  return false;
}

function buildSessionResponse(session, accessExpiresAt) {
  const idleExpiresAt = new Date(session.idle_expires_at).getTime();

  return {
    accessExpiresAt,
    idleExpiresAt,
    absoluteExpiresAt: new Date(session.absolute_expires_at).getTime(),
    warningStartsAt: idleExpiresAt - authDto.IDLE_WARNING_WINDOW_MS,
    serverTime: Date.now(),
  };
}

function mergeManagerName(user, manager) {
  const source = user?.dataValues ? user.dataValues : user;
  return {
    ...source,
    manager_name: manager
      ? `${manager.first_name} ${manager.last_name}`.trim()
      : null,
  };
}

function getRequestIp(command = {}) {
  return (
    command.ipAddress ||
    command.headers?.["x-forwarded-for"] ||
    command.headers?.["x-real-ip"] ||
    null
  );
}

function getRequestUserAgent(command = {}) {
  return command.userAgent || command.headers?.["user-agent"] || null;
}

async function createSessionForUser(user, command = {}) {
  const sessionId = crypto.randomUUID();
  const refreshToken = createRefreshToken(user.id, sessionId);

  const expiry = computeSessionExpiryWindow(new Date());

  const session = await authRepository.createSession({
    id: sessionId,
    user_id: user.id,
    refresh_token_hash: hashRefreshToken(refreshToken),
    refresh_expires_at: expiry.refreshExpiresAt,
    idle_expires_at: expiry.idleExpiresAt,
    absolute_expires_at: expiry.absoluteExpiresAt,
    last_activity_at: new Date(),
    user_agent: getRequestUserAgent(command),
    ip_address: getRequestIp(command),
  });

  return {
    refreshToken,
    session,
  };
}

function verifyTokenOrThrow(token, options = {}) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, options);
  } catch (error) {
    throw createHttpError("Invalid or expired token.", 401);
  }
}

function decodeTokenIgnoreExpiration(token) {
  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
  } catch (error) {
    return null;
  }
}

async function buildAuthPayload(user, session, options = {}) {
  const manager = await authRepository.findManagerById(user.manager_id);
  const totalEmployees =
    options.includeTotalEmployees === true
      ? await authRepository.countEmployees()
      : null;
  const accessToken = createAccessToken(user, session.id);
  const accessDecoded = jwt.decode(accessToken);
  const accessExpiresAt = Number(accessDecoded?.exp || 0) * 1000;

  return {
    accessToken,
    user: mergeManagerName(user, manager),
    totalEmployees,
    session: buildSessionResponse(session, accessExpiresAt),
  };
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

  const { refreshToken, session } = await createSessionForUser(user, command);
  const authPayload = await buildAuthPayload(user, session, {
    includeTotalEmployees: true,
  });

  return {
    accessToken: authPayload.accessToken,
    refreshToken,
    user: authPayload.user,
    totalEmployees: authPayload.totalEmployees,
    session: authPayload.session,
  };
}

async function refresh(command) {
  const decodedRefresh = verifyTokenOrThrow(command.refreshToken);

  if (decodedRefresh.type !== "refresh" || !decodedRefresh.sid) {
    throw createHttpError("Invalid or expired token.", 401);
  }

  const session = await authRepository.findSessionById(decodedRefresh.sid);

  if (!session || Number(session.user_id) !== Number(decodedRefresh.user_id)) {
    throw createHttpError("Session not found.", 401);
  }

  if (isSessionExpired(session)) {
    if (!session.revoked_at) {
      await authRepository.revokeSessionById(session.id, "session_expired");
    }
    throw createHttpError("Session expired. Please sign in again.", 401);
  }

  const incomingHash = hashRefreshToken(command.refreshToken);
  if (incomingHash.length !== session.refresh_token_hash.length) {
    await authRepository.revokeSessionById(session.id, "refresh_hash_mismatch");
    throw createHttpError("Invalid refresh session.", 401);
  }

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(incomingHash),
    Buffer.from(session.refresh_token_hash)
  );

  if (!isMatch) {
    await authRepository.revokeSessionById(session.id, "refresh_hash_mismatch");
    throw createHttpError("Invalid refresh session.", 401);
  }

  const now = new Date();
  const absoluteMs = new Date(session.absolute_expires_at).getTime();
  const nextIdleMs = Math.min(now.getTime() + authDto.IDLE_TIMEOUT_MS, absoluteMs);
  const nextRefreshMs = now.getTime() + authDto.REFRESH_TOKEN_MAX_AGE_MS;

  const nextRefreshToken = createRefreshToken(session.user_id, session.id);

  const updatedSession = await authRepository.updateSessionById(session.id, {
    refresh_token_hash: hashRefreshToken(nextRefreshToken),
    refresh_expires_at: new Date(nextRefreshMs),
    idle_expires_at: new Date(nextIdleMs),
    last_activity_at: now,
    user_agent: getRequestUserAgent(command) || session.user_agent,
    ip_address: getRequestIp(command) || session.ip_address,
  });

  const user = await authRepository.findEmployeeById(session.user_id);
  if (!user) {
    await authRepository.revokeSessionById(session.id, "user_not_found");
    throw createHttpError("User not found.", 404);
  }

  const authPayload = await buildAuthPayload(user, updatedSession);

  return {
    accessToken: authPayload.accessToken,
    refreshToken: nextRefreshToken,
    user: authPayload.user,
    session: authPayload.session,
  };
}

async function logout(command) {
  const decodedAccess = decodeTokenIgnoreExpiration(command.accessToken);
  const decodedRefresh = decodeTokenIgnoreExpiration(command.refreshToken);

  const sessionId = decodedAccess?.sid || decodedRefresh?.sid;
  if (!sessionId) {
    return { revoked: false };
  }

  const revokedSession = await authRepository.revokeSessionById(
    sessionId,
    "manual_logout"
  );

  return { revoked: Boolean(revokedSession) };
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

async function verifyUser(userId, session, accessExpiresAt = null) {
  const user = await authRepository.findEmployeeById(userId);

  if (!user) {
    throw createHttpError("User not found.", 404);
  }

  const manager = await authRepository.findManagerById(user.manager_id);
  const totalEmployees = await authRepository.countEmployees();
  const sessionPayload = buildSessionResponse(
    session,
    accessExpiresAt || Date.now() + authDto.ACCESS_TOKEN_MAX_AGE_MS
  );

  return {
    user: mergeManagerName(user, manager),
    session: sessionPayload,
    totalEmployees,
  };
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  verifyUser,
};
