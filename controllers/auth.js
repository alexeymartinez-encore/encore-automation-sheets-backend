const authDto = require("../dtos/auth-dto");
const authService = require("../services/auth-service");
const csrfToken = require("../util/csrf-token");

function setCsrfCookie(res, sessionId) {
  res.cookie(
    authDto.CSRF_COOKIE_NAME,
    csrfToken.createCsrfToken(sessionId),
    authDto.toCsrfCookieOptions()
  );
}

// Employee Signup
exports.signup = async (req, res, next) => {
  try {
    authDto.assertValidRequest(req);
    const result = await authService.signup(authDto.toSignupCommand(req.body));
    res.status(201).json(authDto.toSignupResponse(result));
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

// Employee Login
exports.login = async (req, res, next) => {
  try {
    const result = await authService.login({
      ...authDto.toLoginCommand(req.body),
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
      headers: req.headers,
    });

    res
      .cookie(
        authDto.ACCESS_COOKIE_NAME,
        result.accessToken,
        authDto.toAccessCookieOptions()
      )
      .cookie(
        authDto.REFRESH_COOKIE_NAME,
        result.refreshToken,
        authDto.toRefreshCookieOptions()
      );
    setCsrfCookie(res, result.sessionId);
    res.status(200).json(authDto.toLoginResponse(result));
  } catch (err) {
    err.statusCode = err.statusCode || 401;
    next(err);
  }
};

// Employee Logout
exports.logout = async (req, res) => {
  try {
    await authService.logout({
      accessToken: req.cookies?.[authDto.ACCESS_COOKIE_NAME],
      refreshToken: req.cookies?.[authDto.REFRESH_COOKIE_NAME],
    });
  } catch (error) {
    // Logout should always clear cookies and complete even when revocation fails.
    console.error("Logout revocation warning:", error.message);
  }

  res
    .clearCookie(authDto.ACCESS_COOKIE_NAME, authDto.toLogoutCookieOptions())
    .clearCookie(authDto.REFRESH_COOKIE_NAME, authDto.toLogoutCookieOptions())
    .clearCookie(authDto.CSRF_COOKIE_NAME, authDto.toLogoutCsrfCookieOptions())
    .status(200)
    .json({ message: "Logged out successfully" });
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[authDto.REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new Error("Refresh token is required.");
    }

    const result = await authService.refresh({
      refreshToken,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
      headers: req.headers,
    });

    res
      .cookie(
        authDto.ACCESS_COOKIE_NAME,
        result.accessToken,
        authDto.toAccessCookieOptions()
      )
      .cookie(
        authDto.REFRESH_COOKIE_NAME,
        result.refreshToken,
        authDto.toRefreshCookieOptions()
      );
    setCsrfCookie(res, result.sessionId);
    res.status(200).json(authDto.toRefreshResponse(result));
  } catch (err) {
    err.statusCode = err.statusCode || 401;
    next(err);
  }
};

// Request Password Reset
exports.requestPasswordReset = async (req, res, next) => {
  try {
    await authService.requestPasswordReset(
      authDto.toPasswordResetRequestCommand(req.body)
    );
    res.status(200).json(authDto.toPasswordResetRequestResponse());
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(authDto.toResetPasswordCommand(req.body));
    res.status(200).json(authDto.toResetPasswordResponse());
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};

// Verify Employee
exports.verifyMe = async (req, res, next) => {
  try {
    const result = await authService.verifyUser(
      req.userId,
      req.session,
      req.accessTokenExpiresAt
    );

    if (
      !csrfToken.verifyCsrfToken(
        req.cookies?.[authDto.CSRF_COOKIE_NAME],
        req.session?.id
      )
    ) {
      setCsrfCookie(res, req.session.id);
    }

    res.status(200).json(authDto.toVerifyResponse(result));
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};
