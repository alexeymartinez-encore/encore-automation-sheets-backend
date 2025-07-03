const express = require("express");

const miscellaneousController = require("../controllers/miscellaneous");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/projects", isAuth, miscellaneousController.getAllProjects);
router.get("/phases", isAuth, miscellaneousController.getAllPhases);
router.get("/costCodes", isAuth, miscellaneousController.getAllCostCodes);
router.get("/miscCodes", isAuth, miscellaneousController.getAllMisc);
router.get("/customers", isAuth, miscellaneousController.getAllCustomers);

module.exports = router;
