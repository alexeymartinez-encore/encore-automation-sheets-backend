const Employee = require("../models/employee");
const Authentication = require("../models/authentication");
const AuthSession = require("../models/auth_session");

async function findEmployeeByEmail(email, options = {}) {
  return Employee.findOne({
    where: { email },
    ...options,
  });
}

async function findEmployeeByUserName(userName, options = {}) {
  return Employee.findOne({
    where: { user_name: userName },
    ...options,
  });
}

async function findEmployeeById(userId, options = {}) {
  return Employee.findByPk(userId, options);
}

async function createEmployee(payload, options = {}) {
  return Employee.create(payload, options);
}

async function countEmployees(options = {}) {
  return Employee.count(options);
}

async function findManagerById(managerId, options = {}) {
  if (!managerId) {
    return null;
  }

  return Employee.findByPk(managerId, {
    attributes: ["first_name", "last_name"],
    ...options,
  });
}

async function findAuthenticationByUserId(userId, options = {}) {
  return Authentication.findOne({
    where: { user_id: userId },
    ...options,
  });
}

async function createAuthentication(payload, options = {}) {
  return Authentication.create(payload, options);
}

async function updateAuthenticationByUserId(userId, updates, options = {}) {
  const authRecord = await findAuthenticationByUserId(userId, options);

  if (!authRecord) {
    return null;
  }

  return authRecord.update(updates, options);
}

async function createSession(payload, options = {}) {
  return AuthSession.create(payload, options);
}

async function findSessionById(sessionId, options = {}) {
  return AuthSession.findByPk(sessionId, options);
}

async function updateSessionById(sessionId, updates, options = {}) {
  const session = await findSessionById(sessionId, options);

  if (!session) {
    return null;
  }

  return session.update(updates, options);
}

async function revokeSessionById(sessionId, reason = "logout", options = {}) {
  const session = await findSessionById(sessionId, options);
  if (!session) {
    return null;
  }

  return session.update(
    {
      revoked_at: new Date(),
      revoked_reason: reason,
    },
    options
  );
}

module.exports = {
  findEmployeeByEmail,
  findEmployeeByUserName,
  findEmployeeById,
  createEmployee,
  countEmployees,
  findManagerById,
  findAuthenticationByUserId,
  createAuthentication,
  updateAuthenticationByUserId,
  createSession,
  findSessionById,
  updateSessionById,
  revokeSessionById,
};
