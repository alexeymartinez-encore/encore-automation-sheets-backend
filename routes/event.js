const express = require("express");

const eventController = require("../controllers/event");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/types", isAuth, eventController.fetchEventTypes);
router.post("/types", isAuth, eventController.createEventType);
router.put("/types/:typeId", isAuth, eventController.updateEventTypeById);
router.delete("/types/:typeId", isAuth, eventController.deleteEventTypeById);

router.get("/range", isAuth, eventController.fetchEventsByRange);
router.get("/report", isAuth, eventController.fetchEventReport);

router.post("/new-event", isAuth, eventController.saveEvent);
router.get("/:date", isAuth, eventController.fetchEventsByMonth);
router.put("/update/:eventId", isAuth, eventController.editEventById);
router.delete("/delete/:eventId", isAuth, eventController.deleteEventById);

module.exports = router;
