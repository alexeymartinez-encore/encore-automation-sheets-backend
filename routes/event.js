const express = require("express");

const eventController = require("../controllers/event");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.post("/new-event", isAuth, eventController.saveEvent);
router.get("/:date", isAuth, eventController.fetchEventsByMonth);
router.put("/update/:eventId", isAuth, eventController.editEventById);
router.delete("/delete/:eventId", isAuth, eventController.deleteEventById);

module.exports = router;
