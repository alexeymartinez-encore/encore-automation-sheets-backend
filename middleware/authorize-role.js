const Employee = require("../models/employee");

const ROLE_TO_ID = {
  employee: 1,
  manager: 2,
  admin: 3,
};

function forbidden(message = "Forbidden.") {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function normalizeRoleInput(roles) {
  const roleList = Array.isArray(roles) ? roles : [roles];

  return roleList
    .map((role) => {
      if (typeof role === "number") {
        return role;
      }

      const normalized = String(role || "")
        .trim()
        .toLowerCase();
      return ROLE_TO_ID[normalized];
    })
    .filter((roleId) => Number.isInteger(roleId));
}

module.exports = function authorizeRole(roles) {
  const allowedRoleIds = normalizeRoleInput(roles);

  return async (req, res, next) => {
    if (!req.userId) {
      return next(forbidden("Not authorized."));
    }

    try {
      const actor = await Employee.findByPk(req.userId, {
        attributes: ["id", "role_id", "is_active"],
      });

      if (!actor || !actor.is_active) {
        return next(forbidden("User is inactive or unavailable."));
      }

      if (!allowedRoleIds.includes(Number(actor.role_id))) {
        return next(forbidden("You do not have permission for this action."));
      }

      req.actor = actor;
      req.userRoleId = Number(actor.role_id);
      return next();
    } catch (error) {
      error.statusCode = error.statusCode || 500;
      return next(error);
    }
  };
};
