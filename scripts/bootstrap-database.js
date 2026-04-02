const path = require("path");
const { spawn } = require("child_process");

const sql = require("mssql");

const {
  loadSeedEnvironment,
} = require("../db_individual_creations/load-seed-env");

loadSeedEnvironment();

const seedScripts = [
  "../scripts/sync-schema.js",
  "roles.js",
  "customer.js",
  "phases.js",
  "cost_codes.js",
  "miscellaneous.js",
  "projects.js",
  "user.js",
  "authentication.js",
  "event.js",
];

function getTargetDatabaseName() {
  const requestedName =
    process.argv[2] || process.env.DB_BOOTSTRAP_NAME || process.env.DB_NAME;

  if (!requestedName) {
    throw new Error(
      "Provide a database name as the first argument or set DB_BOOTSTRAP_NAME/DB_NAME."
    );
  }

  if (!/^[A-Za-z0-9_-]+$/.test(requestedName)) {
    throw new Error(
      "Database names for this script may only contain letters, numbers, underscores, and hyphens."
    );
  }

  return requestedName;
}

function getSqlAdminConfig() {
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 1433),
    database: "master",
    options: {
      encrypt: false,
      trustServerCertificate: false,
    },
  };
}

async function createDatabaseOrFail(databaseName) {
  const pool = await sql.connect(getSqlAdminConfig());

  try {
    const lookup = await pool
      .request()
      .input("databaseName", sql.NVarChar, databaseName)
      .query("SELECT DB_ID(@databaseName) AS databaseId");

    if (lookup.recordset[0]?.databaseId) {
      throw new Error(
        `Database "${databaseName}" already exists. Choose a new name or remove the existing database before bootstrapping.`
      );
    }

    await pool.request().query(`CREATE DATABASE [${databaseName}]`);
    console.log(`Created database "${databaseName}".`);
  } finally {
    await pool.close();
    await sql.close();
  }
}

async function runSeedScript(scriptName, env) {
  const scriptPath = scriptName.startsWith("../")
    ? path.join(__dirname, scriptName)
    : path.join(__dirname, "..", "db_individual_creations", scriptName);

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, ".."),
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function main() {
  const databaseName = getTargetDatabaseName();

  await createDatabaseOrFail(databaseName);

  const childEnv = {
    ...process.env,
    DB_NAME: databaseName,
  };

  for (const scriptName of seedScripts) {
    console.log(`Running seed script: ${scriptName}`);
    await runSeedScript(scriptName, childEnv);
  }

  console.log(
    `Bootstrap complete for "${databaseName}". Seeded users use SEED_DEFAULT_PASSWORD or the fallback password "ChangeMe123!"`
  );
}

main().catch((error) => {
  console.error("Database bootstrap failed:", error);
  process.exit(1);
});
