const path = require("path");
const dotenv = require("dotenv");

// Load correct .env file based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || "dev"}`;
dotenv.config({ path: path.resolve(__dirname, envFile) });

const app = require("./app");
const { initializeDB } = require("./config/db");

const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT} [${process.env.NODE_ENV}]`);
  await initializeDB();
});
