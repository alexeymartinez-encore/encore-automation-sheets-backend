const authDto = require("../dtos/auth-dto");
const authService = require("../services/auth-service");

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
    const result = await authService.login(authDto.toLoginCommand(req.body));

    res
      .cookie("token", result.token, authDto.toCookieOptions())
      .status(200)
      .json(authDto.toLoginResponse(result));
  } catch (err) {
    err.statusCode = err.statusCode || 401;
    next(err);
  }
};

// Employee Logout
exports.logout = (req, res, next) => {
  res.clearCookie("token", authDto.toLogoutCookieOptions());
  res.status(200).json({ message: "Logged out successfully" });
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
    const result = await authService.verifyUser(req.userId);
    res.status(200).json(authDto.toVerifyResponse(result));
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    next(err);
  }
};
