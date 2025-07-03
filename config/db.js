const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mssql",
    port: 1433,
    timezone: "+00:00",
    dialectOptions: {
      options: {
        encrypt: false,
        trustServerCertificate: false,
      },
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false, // only log in dev
  }
);

async function initializeDB() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database");
  } catch (error) {
    console.error("DB connection failed:", error.message);
  }
}

module.exports = { sequelize, initializeDB };
