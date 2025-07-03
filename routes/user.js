const express = require("express");

const userController = require("../controllers/user");
const isAuth = require("../middleware/is-auth");

const router = express.Router();
router.get("/all-employees", userController.getAllEmployees);

router.get("/:id", isAuth, userController.getUserById);

module.exports = router;
