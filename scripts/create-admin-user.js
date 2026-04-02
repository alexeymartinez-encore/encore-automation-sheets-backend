const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const {
  loadSeedEnvironment,
} = require("../db_individual_creations/load-seed-env");

loadSeedEnvironment();

const { sequelize, Role, Employee, Authentication } = require("../models");
const { Op } = require("sequelize");

function getRequiredString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function getNumber(value, fieldName) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
}

function getAdminConfig() {
  return {
    user_name: getRequiredString(
      process.env.ADMIN_USER_NAME || "admin",
      "ADMIN_USER_NAME"
    ),
    email: getRequiredString(
      process.env.ADMIN_EMAIL || "admin@example.com",
      "ADMIN_EMAIL"
    ).toLowerCase(),
    password: getRequiredString(
      process.env.ADMIN_PASSWORD || "Admin123!",
      "ADMIN_PASSWORD"
    ),
    first_name: getRequiredString(
      process.env.ADMIN_FIRST_NAME || "Admin",
      "ADMIN_FIRST_NAME"
    ),
    last_name: getRequiredString(
      process.env.ADMIN_LAST_NAME || "User",
      "ADMIN_LAST_NAME"
    ),
    employee_number: getNumber(
      process.env.ADMIN_EMPLOYEE_NUMBER || 9001,
      "ADMIN_EMPLOYEE_NUMBER"
    ),
    position: getRequiredString(
      process.env.ADMIN_POSITION || "System Administrator",
      "ADMIN_POSITION"
    ),
    cell_phone: getRequiredString(
      process.env.ADMIN_CELL_PHONE || "(555)-000-0000",
      "ADMIN_CELL_PHONE"
    ),
    home_phone: process.env.ADMIN_HOME_PHONE?.trim() || null,
    is_contractor: false,
    is_active: true,
    allow_overtime: true,
    manager_id: null,
  };
}

async function ensureAdminRole(transaction) {
  const [role] = await Role.findOrCreate({
    where: { role_name: "Admin" },
    defaults: {
      description: "This is an admin, with full permissions",
    },
    transaction,
  });

  return role;
}

async function findConflictingEmployee(adminConfig, transaction) {
  return Employee.findOne({
    where: {
      [Op.or]: [
        { user_name: adminConfig.user_name },
        { email: adminConfig.email },
        { employee_number: adminConfig.employee_number },
      ],
    },
    transaction,
  });
}

async function upsertAdminUser(adminConfig) {
  return sequelize.transaction(async (transaction) => {
    const role = await ensureAdminRole(transaction);
    const existingEmployee = await findConflictingEmployee(
      adminConfig,
      transaction
    );

    let employee;

    if (existingEmployee) {
      employee = await existingEmployee.update(
        {
          user_name: adminConfig.user_name,
          email: adminConfig.email,
          first_name: adminConfig.first_name,
          last_name: adminConfig.last_name,
          employee_number: adminConfig.employee_number,
          position: adminConfig.position,
          cell_phone: adminConfig.cell_phone,
          home_phone: adminConfig.home_phone,
          role_id: role.id,
          manager_id: adminConfig.manager_id,
          is_contractor: adminConfig.is_contractor,
          is_active: adminConfig.is_active,
          allow_overtime: adminConfig.allow_overtime,
        },
        { transaction }
      );
    } else {
      employee = await Employee.create(
        {
          ...adminConfig,
          role_id: role.id,
        },
        { transaction }
      );
    }

    const password_hash = await bcrypt.hash(adminConfig.password, 12);
    const salt = crypto.randomBytes(16).toString("hex");

    const existingAuth = await Authentication.findOne({
      where: { user_id: employee.id },
      transaction,
    });

    if (existingAuth) {
      await existingAuth.update(
        {
          password_hash,
          salt,
          last_login: new Date(),
          failed_attempts: 0,
        },
        { transaction }
      );
    } else {
      await Authentication.create(
        {
          user_id: employee.id,
          password_hash,
          salt,
          last_login: new Date(),
          failed_attempts: 0,
        },
        { transaction }
      );
    }

    return {
      employee,
      password: adminConfig.password,
    };
  });
}

async function main() {
  const adminConfig = getAdminConfig();

  try {
    await sequelize.sync();
    const result = await upsertAdminUser(adminConfig);

    console.log("Admin user is ready.");
    console.log(`Username: ${result.employee.user_name}`);
    console.log(`Password: ${result.password}`);
    console.log(`Email: ${result.employee.email}`);
  } catch (error) {
    console.error("Failed to create admin user:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
