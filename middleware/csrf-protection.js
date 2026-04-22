const jwt = require("jsonwebtoken");

const authDto = require("../dtos/auth-dto");
const csrfToken = require("../util/csrf-token");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = new Set([
  "/auth/login",
  "/auth/request-reset",
  "/auth/reset-password",
]);

function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin, allowedOrigins) {
  return allowedOrigins.includes(origin);
}

function forbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function getSessionIdFromToken(token, expectedType) {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    if (decoded?.type !== expectedType || !decoded.sid) {
      return null;
    }

    return decoded.sid;
  } catch (error) {
    return null;
  }
}

function getSessionBoundCsrfId(req) {
  return (
    getSessionIdFromToken(
      req.cookies?.[authDto.REFRESH_COOKIE_NAME],
      "refresh"
    ) ||
    getSessionIdFromToken(req.cookies?.[authDto.ACCESS_COOKIE_NAME], "access")
  );
}

module.exports = function csrfProtection(req, res, next) {
  const method = String(req.method || "").toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return next();
  }

  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  const accessCookie = req.cookies?.[authDto.ACCESS_COOKIE_NAME];
  const refreshCookie = req.cookies?.[authDto.REFRESH_COOKIE_NAME];
  const hasSessionCookies = Boolean(accessCookie || refreshCookie);

  if (!hasSessionCookies) {
    return next();
  }

  const allowedOrigins = parseAllowedOrigins();
  const originHeader = req.get("origin");
  const fetchSite = String(req.get("sec-fetch-site") || "").toLowerCase();
  const isTrustedFetchSite =
    fetchSite === "same-origin" ||
    fetchSite === "same-site" ||
    fetchSite === "none";

  if (
    (!originHeader && !isTrustedFetchSite) ||
    (originHeader && !isOriginAllowed(originHeader, allowedOrigins))
  ) {
    return next(forbidden("Invalid request origin."));
  }

  const csrfCookie = req.cookies?.[authDto.CSRF_COOKIE_NAME];
  const csrfHeader = req.get("x-csrf-token");
  const sessionId = getSessionBoundCsrfId(req);

  if (
    !csrfCookie ||
    !csrfHeader ||
    !sessionId ||
    !csrfToken.timingSafeEqualString(csrfCookie, csrfHeader) ||
    !csrfToken.verifyCsrfToken(csrfHeader, sessionId)
  ) {
    return next(forbidden("Invalid CSRF token."));
  }

  return next();
};
