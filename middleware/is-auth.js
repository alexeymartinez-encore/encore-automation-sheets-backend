const jwt = require("jsonwebtoken");

const authDto = require("../dtos/auth-dto");
const authRepository = require("../repositories/auth-repository");

function unauthorized(message = "Not authenticated.") {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
}

function sessionExpired() {
  return unauthorized("Session expired. Please sign in again.");
}

module.exports = async (req, res, next) => {
  const token = req.cookies?.[authDto.ACCESS_COOKIE_NAME];
  if (!token) {
    return next(unauthorized());
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return next(unauthorized("Invalid or expired access token."));
    }

    error.statusCode = 500;
    return next(error);
  }

  if (
    !decodedToken ||
    decodedToken.type !== "access" ||
    !decodedToken.sid ||
    !decodedToken.user_id
  ) {
    return next(unauthorized("Invalid access token."));
  }

  try {
    const session = await authRepository.findSessionById(decodedToken.sid);
    if (!session || Number(session.user_id) !== Number(decodedToken.user_id)) {
      return next(unauthorized("Session not found."));
    }

    const nowMs = Date.now();
    if (session.revoked_at) {
      return next(unauthorized("Session revoked."));
    }

    if (nowMs >= new Date(session.refresh_expires_at).getTime()) {
      return next(sessionExpired());
    }

    if (nowMs >= new Date(session.idle_expires_at).getTime()) {
      return next(sessionExpired());
    }

    if (nowMs >= new Date(session.absolute_expires_at).getTime()) {
      return next(sessionExpired());
    }

    req.userId = decodedToken.user_id;
    req.userRoleId = Number(decodedToken.role_id);
    req.session = session;
    req.accessTokenExpiresAt = Number(decodedToken.exp) * 1000;
    return next();
  } catch (error) {
    error.statusCode = error.statusCode || 500;
    return next(error);
  }
};
