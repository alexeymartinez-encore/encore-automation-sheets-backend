const { loadSeedEnvironment } = require("../db_individual_creations/load-seed-env");

loadSeedEnvironment();

const { sequelize } = require("../models");

async function syncSchema() {
  try {
    await sequelize.sync();
    console.log("Full database schema created successfully.");
  } catch (error) {
    console.error("Failed to create full database schema:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

syncSchema();
