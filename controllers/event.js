const { Op, literal } = require("sequelize");

const { Event, Employee, EventType, EventMetadata } = require("../models");

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DEFAULT_EVENT_TYPES = [
  {
    key: "vacation",
    label: "Vacation",
    back_color: "#1D4ED8",
    fore_color: "#FFFFFF",
    is_holiday: false,
  },
  {
    key: "vacation-morning",
    label: "Vacation (Morning)",
    back_color: "#93C5FD",
    fore_color: "#1E3A8A",
    is_holiday: false,
  },
  {
    key: "vacation-afternoon",
    label: "Vacation (Afternoon)",
    back_color: "#DBEAFE",
    fore_color: "#1E3A8A",
    is_holiday: false,
  },
  {
    key: "bereavement",
    label: "Bereavement",
    back_color: "#6D28D9",
    fore_color: "#FFFFFF",
    is_holiday: false,
  },
  {
    key: "sick",
    label: "Sick",
    back_color: "#DC2626",
    fore_color: "#FFFFFF",
    is_holiday: false,
  },
  {
    key: "jury-duty",
    label: "Jury Duty",
    back_color: "#7C3AED",
    fore_color: "#FFFFFF",
    is_holiday: false,
  },
  {
    key: "holiday",
    label: "Holiday",
    back_color: "#047857",
    fore_color: "#FFFFFF",
    is_holiday: true,
  },
  {
    key: "appointment",
    label: "Appointment",
    back_color: "#EA580C",
    fore_color: "#FFFFFF",
    is_holiday: false,
  },
  {
    key: "on-site",
    label: "On Site",
    back_color: "#0891B2",
    fore_color: "#FFFFFF",
    is_holiday: false,
  },
  {
    key: "other",
    label: "Other",
    back_color: "#334155",
    fore_color: "#FFFFFF",
    is_holiday: false,
  },
];

let eventTypeSetupPromise = null;

const EVENT_DATEONLY_ATTRIBUTES = {
  include: [
    [literal("CONVERT(varchar(10), [Event].[start], 23)"), "start_dateonly"],
    [
      literal("CONVERT(varchar(10), [Event].[end_date], 23)"),
      "end_date_dateonly",
    ],
  ],
};

function padTwo(value) {
  return String(value).padStart(2, "0");
}

function formatDateParts(year, month, day) {
  return `${year}-${padTwo(month)}-${padTwo(day)}`;
}

function isMidnight(hours, minutes, seconds, milliseconds) {
  return hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0;
}

function formatDateObject(date) {
  const shouldPreferUtc =
    isMidnight(
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ) &&
    !isMidnight(
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    );

  if (shouldPreferUtc) {
    return formatDateParts(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
  }

  return formatDateParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function toDateOnly(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Preserve true DATEONLY values as-is. Datetime strings are parsed below.
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    value = /^\d{4}-\d{2}-\d{2} /.test(trimmed)
      ? trimmed.replace(" ", "T")
      : trimmed;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return formatDateObject(parsed);
}

function parseIdList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }
  return null;
}

function isHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value || ""));
}

function getFormattedMonth(dateOnly) {
  const [year, month] = String(dateOnly || "").split("-");
  const monthIndex = Number(month) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return null;
  return `${year}${MONTH_NAMES[monthIndex]}`;
}

function getRangeForMonthToken(monthToken) {
  const normalized = String(monthToken || "").trim();
  const tokenMatch = normalized.match(/^(\d{4})([A-Za-z]{3})$/);
  if (tokenMatch) {
    const year = Number(tokenMatch[1]);
    const monthIndex = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase() === tokenMatch[2].toLowerCase(),
    );
    if (monthIndex < 0) return null;

    const month = String(monthIndex + 1).padStart(2, "0");
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0))
      .getUTCDate()
      .toString()
      .padStart(2, "0");

    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${lastDay}`,
    };
  }

  const dateOnly = toDateOnly(normalized);
  if (!dateOnly) return null;
  const [year, month] = dateOnly.split("-");
  const monthIndex = Number(month) - 1;
  const lastDay = new Date(Date.UTC(Number(year), monthIndex + 1, 0))
    .getUTCDate()
    .toString()
    .padStart(2, "0");
  return {
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${lastDay}`,
  };
}

function buildComposedTitle(
  employee,
  eventTypeLabel,
  note,
  fallbackTitle = "",
  isHoliday = false,
) {
  const trimmedNote = String(note || "").trim();
  const safeType = String(eventTypeLabel || "").trim();

  if (isHoliday) {
    const holidayTitle = safeType || String(fallbackTitle || "").trim();
    return trimmedNote && holidayTitle
      ? `${holidayTitle} (${trimmedNote})`
      : holidayTitle;
  }

  const firstName = String(employee?.first_name || "").trim();
  const lastName = String(employee?.last_name || "").trim();
  const namePart = [lastName, firstName].filter(Boolean).join(", ");

  const baseParts = [namePart, safeType].filter(Boolean);
  const baseTitle = baseParts.join(" ").trim();

  if (!baseTitle) return String(fallbackTitle || "").trim();
  return trimmedNote ? `${baseTitle} (${trimmedNote})` : baseTitle;
}

async function ensureEventTypeSetup() {
  if (!eventTypeSetupPromise) {
    eventTypeSetupPromise = (async () => {
      await EventType.sync();
      await EventMetadata.sync();

      for (const type of DEFAULT_EVENT_TYPES) {
        await EventType.findOrCreate({
          where: { key: type.key },
          defaults: type,
        });
      }
    })();
  }

  try {
    await eventTypeSetupPromise;
  } catch (error) {
    eventTypeSetupPromise = null;
    throw error;
  }
}

function mapEventType(eventTypeInstance) {
  const eventType = eventTypeInstance?.toJSON
    ? eventTypeInstance.toJSON()
    : eventTypeInstance;

  return {
    id: eventType.id,
    key: eventType.key,
    label: eventType.label,
    back_color: eventType.back_color,
    fore_color: eventType.fore_color,
    is_holiday: Boolean(eventType.is_holiday),
    is_active: Boolean(eventType.is_active),
    createdAt: eventType.createdAt,
    updatedAt: eventType.updatedAt,
  };
}

function getEventMetadataRecord(event) {
  if (!event) return null;

  return (
    event.EventMetadata ||
    event.EventMetadatum ||
    event.eventMetadata ||
    event.event_metadata ||
    null
  );
}

function getMetadataEventType(metadata) {
  if (!metadata) return null;

  return (
    metadata.EventType || metadata.eventType || metadata.event_type || null
  );
}

function getProjectedDateOnly(event, key) {
  const value = event?.[key] ?? event?.dataValues?.[key];
  if (!value) return null;
  return String(value).trim();
}

function mapEventRecord(eventInstance) {
  const event = eventInstance?.toJSON ? eventInstance.toJSON() : eventInstance;
  const metadata = getEventMetadataRecord(event);
  const eventType = getMetadataEventType(metadata);
  const note = metadata?.note ?? event.long_description ?? "";
  const startDateOnly =
    getProjectedDateOnly(event, "start_dateonly") || toDateOnly(event.start);
  const endDateOnly =
    getProjectedDateOnly(event, "end_date_dateonly") ||
    toDateOnly(event.end_date);

  const composedTitle = buildComposedTitle(
    event.Employee,
    eventType?.label,
    note,
    event.title,
    Boolean(eventType?.is_holiday),
  );

  return {
    id: event.id,
    employee_id: event.employee_id,
    start: startDateOnly,
    end_date: endDateOnly,
    title: composedTitle || event.title,
    formatted_month: event.formatted_month || getFormattedMonth(startDateOnly),
    long_description: note,
    back_color_id: eventType?.back_color || event.back_color_id,
    fore_color_id: eventType?.fore_color || event.fore_color_id,
    event_type_id: metadata?.event_type_id || null,
    event_type_key: eventType?.key || null,
    event_type_label: eventType?.label || null,
    is_holiday: Boolean(eventType?.is_holiday),
    Employee: event.Employee
      ? {
          id: event.Employee.id,
          first_name: event.Employee.first_name,
          last_name: event.Employee.last_name,
        }
      : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

async function requireAdmin(userId) {
  const actor = await Employee.findByPk(userId, {
    attributes: ["id", "role_id"],
  });
  if (!actor || Number(actor.role_id) !== 3) {
    return null;
  }
  return actor;
}

async function resolveEmployeeScope(actorId, requestedEmployeeIds = []) {
  const actor = await Employee.findByPk(actorId, {
    attributes: ["id", "role_id"],
  });

  if (!actor) {
    const error = new Error("Authenticated employee not found.");
    error.statusCode = 401;
    throw error;
  }

  return requestedEmployeeIds;
}

async function resolveEventType({
  eventTypeId,
  eventTypeKey,
  eventTypeLabel,
  backColor,
  foreColor,
}) {
  if (eventTypeId) {
    const byId = await EventType.findByPk(Number(eventTypeId));
    if (byId) return byId;
  }

  if (eventTypeKey) {
    const byKey = await EventType.findOne({
      where: { key: slugify(eventTypeKey) },
    });
    if (byKey) return byKey;
  }

  if (eventTypeLabel) {
    const byLabel = await EventType.findOne({
      where: { label: String(eventTypeLabel).trim() },
    });
    if (byLabel) return byLabel;
  }

  if (backColor && foreColor) {
    const byColor = await EventType.findOne({
      where: { back_color: backColor, fore_color: foreColor },
    });
    if (byColor) return byColor;
  }

  const defaultOther = await EventType.findOne({ where: { key: "other" } });
  if (defaultOther) return defaultOther;

  return EventType.findOne({
    where: { is_active: true },
    order: [["id", "ASC"]],
  });
}

async function queryEvents({
  startDate,
  endDate,
  employeeIds = [],
  eventTypeIds = [],
  search = "",
}) {
  await ensureEventTypeSetup();

  const where = {
    [Op.and]: [
      { start: { [Op.lte]: endDate } },
      { end_date: { [Op.gte]: startDate } },
    ],
  };

  const metadataInclude = {
    model: EventMetadata,
    required: eventTypeIds.length > 0,
    include: [
      {
        model: EventType,
        required: false,
      },
    ],
  };

  if (eventTypeIds.length > 0) {
    metadataInclude.where = { event_type_id: { [Op.in]: eventTypeIds } };
  }

  const events = await Event.findAll({
    attributes: EVENT_DATEONLY_ATTRIBUTES,
    where,
    include: [
      {
        model: Employee,
        attributes: ["id", "first_name", "last_name"],
        required: false,
      },
      metadataInclude,
    ],
    order: [
      ["start", "ASC"],
      ["id", "ASC"],
    ],
  });

  let mapped = events.map(mapEventRecord);

  if (employeeIds.length > 0) {
    mapped = mapped.filter(
      (event) =>
        event.is_holiday || employeeIds.includes(Number(event.employee_id)),
    );
  }

  const trimmedSearch = String(search || "")
    .trim()
    .toLowerCase();
  if (trimmedSearch) {
    mapped = mapped.filter((event) => {
      const haystack = [
        event.title,
        event.long_description,
        event.event_type_label,
        event.Employee?.first_name,
        event.Employee?.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(trimmedSearch);
    });
  }

  return mapped;
}

async function saveOrUpdateEvent({ eventId = null, payload = {}, actorId }) {
  await ensureEventTypeSetup();

  const actor = await Employee.findByPk(actorId, {
    attributes: ["id", "role_id"],
  });

  if (!actor) {
    const error = new Error("Authenticated employee not found.");
    error.statusCode = 401;
    throw error;
  }

  const actorRoleId = Number(actor.role_id);
  const canAssignOtherEmployees = actorRoleId === 3;

  const existingEvent = eventId
    ? await Event.findByPk(eventId, {
        attributes: EVENT_DATEONLY_ATTRIBUTES,
        include: [
          {
            model: EventMetadata,
            required: false,
            include: [{ model: EventType, required: false }],
          },
          {
            model: Employee,
            attributes: ["id", "first_name", "last_name"],
            required: false,
          },
        ],
      })
    : null;

  if (
    existingEvent &&
    !canAssignOtherEmployees &&
    Number(existingEvent.employee_id) !== Number(actorId)
  ) {
    const error = new Error("You can only edit your own events.");
    error.statusCode = 403;
    throw error;
  }

  if (eventId && !existingEvent) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  const startDate = toDateOnly(payload.start || existingEvent?.start);
  const endDate = toDateOnly(
    payload.end_date ||
      payload.start ||
      existingEvent?.end_date ||
      existingEvent?.start,
  );

  if (!startDate || !endDate) {
    const error = new Error("start and end_date are required.");
    error.statusCode = 400;
    throw error;
  }

  if (endDate < startDate) {
    const error = new Error("end_date cannot be before start.");
    error.statusCode = 400;
    throw error;
  }

  const existingMetadataRecord = getEventMetadataRecord(existingEvent);
  const existingEventType = getMetadataEventType(existingMetadataRecord);

  if (existingEventType?.is_holiday && actorRoleId !== 3) {
    const error = new Error("Only admins can edit holidays.");
    error.statusCode = 403;
    throw error;
  }

  const eventType = await resolveEventType({
    eventTypeId:
      payload.event_type_id ||
      payload.eventTypeId ||
      existingMetadataRecord?.event_type_id,
    eventTypeKey: payload.event_type_key || payload.eventTypeKey,
    eventTypeLabel: payload.event_type_label || payload.eventTypeLabel,
    backColor: payload.back_color_id || existingEvent?.back_color_id,
    foreColor: payload.fore_color_id || existingEvent?.fore_color_id,
  });

  if (eventType?.is_holiday && actorRoleId !== 3) {
    const error = new Error("Only admins can create or edit holidays.");
    error.statusCode = 403;
    throw error;
  }

  const requestedEmployeeId = Number(
    payload.employee_id || existingEvent?.employee_id || actorId,
  );
  const employeeId = eventType?.is_holiday
    ? Number(actorId)
    : canAssignOtherEmployees
      ? requestedEmployeeId
      : Number(actorId);
  if (!employeeId) {
    const error = new Error("employee_id is required.");
    error.statusCode = 400;
    throw error;
  }

  const employee = await Employee.findByPk(employeeId, {
    attributes: ["id", "first_name", "last_name"],
  });

  if (!employee) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }

  const noteInput =
    payload.note ??
    payload.long_description ??
    existingMetadataRecord?.note ??
    existingEvent?.long_description ??
    "";
  const note = String(noteInput || "").trim();

  const composedTitle = buildComposedTitle(
    employee,
    eventType?.label,
    note,
    payload.title || existingEvent?.title,
    Boolean(eventType?.is_holiday),
  );

  const eventPayload = {
    employee_id: employeeId,
    start: startDate,
    end_date: endDate,
    long_description: note,
    title: composedTitle || payload.title || existingEvent?.title || "Event",
    back_color_id:
      eventType?.back_color ||
      payload.back_color_id ||
      existingEvent?.back_color_id ||
      "#334155",
    fore_color_id:
      eventType?.fore_color ||
      payload.fore_color_id ||
      existingEvent?.fore_color_id ||
      "#FFFFFF",
    formatted_month:
      getFormattedMonth(startDate) || existingEvent?.formatted_month,
  };

  let savedEvent = existingEvent;

  if (existingEvent) {
    await Event.update(eventPayload, {
      where: { id: existingEvent.id },
    });
    savedEvent = await Event.findByPk(existingEvent.id);
  } else {
    savedEvent = await Event.create(eventPayload);
  }

  if (eventType) {
    const existingMetadata = await EventMetadata.findOne({
      where: { event_id: savedEvent.id },
    });

    if (existingMetadata) {
      await existingMetadata.update({
        event_type_id: eventType.id,
        note,
      });
    } else {
      await EventMetadata.create({
        event_id: savedEvent.id,
        event_type_id: eventType.id,
        note,
      });
    }
  }

  const hydratedEvent = await Event.findByPk(savedEvent.id, {
    attributes: EVENT_DATEONLY_ATTRIBUTES,
    include: [
      {
        model: Employee,
        attributes: ["id", "first_name", "last_name"],
        required: false,
      },
      {
        model: EventMetadata,
        required: false,
        include: [{ model: EventType, required: false }],
      },
    ],
  });

  return mapEventRecord(hydratedEvent);
}

exports.fetchEventTypes = async (req, res) => {
  try {
    await ensureEventTypeSetup();

    const includeInactive = parseBoolean(req.query.includeInactive) === true;

    const where = includeInactive ? {} : { is_active: true };
    const eventTypes = await EventType.findAll({
      where,
      order: [
        ["label", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.status(200).json({
      data: eventTypes.map(mapEventType),
      message: "Event types fetched successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error fetching event types:", error);
    return res.status(500).json({
      message: "Error fetching event types.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.createEventType = async (req, res) => {
  try {
    await ensureEventTypeSetup();

    const actor = await requireAdmin(req.userId);
    if (!actor) {
      return res.status(403).json({
        message: "Only admins can manage event types.",
        data: [],
        internalStatus: "fail",
      });
    }

    const label = String(req.body.label || "").trim();
    const key = slugify(req.body.key || label);
    const backColor = String(req.body.back_color || "").trim();
    const foreColor = String(req.body.fore_color || "").trim();
    const isHoliday = parseBoolean(req.body.is_holiday) === true;

    if (!label || !key || !isHexColor(backColor) || !isHexColor(foreColor)) {
      return res.status(400).json({
        message:
          "label, key (or label), back_color, and fore_color are required. Colors must be hex values like #1D4ED8.",
        data: [],
        internalStatus: "fail",
      });
    }

    const existingType = await EventType.findOne({
      where: {
        [Op.or]: [{ key }, { label }],
      },
    });

    if (existingType) {
      return res.status(409).json({
        message: "An event type with this key or label already exists.",
        data: [],
        internalStatus: "fail",
      });
    }

    const created = await EventType.create({
      key,
      label,
      back_color: backColor,
      fore_color: foreColor,
      is_holiday: isHoliday,
      is_active: true,
    });

    return res.status(201).json({
      data: mapEventType(created),
      message: "Event type created successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error creating event type:", error);
    return res.status(500).json({
      message: "Error creating event type.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.updateEventTypeById = async (req, res) => {
  try {
    await ensureEventTypeSetup();

    const actor = await requireAdmin(req.userId);
    if (!actor) {
      return res.status(403).json({
        message: "Only admins can manage event types.",
        data: [],
        internalStatus: "fail",
      });
    }

    const eventTypeId = Number(req.params.typeId);
    if (!eventTypeId) {
      return res.status(400).json({
        message: "A valid event type id is required.",
        data: [],
        internalStatus: "fail",
      });
    }

    const eventType = await EventType.findByPk(eventTypeId);
    if (!eventType) {
      return res.status(404).json({
        message: "Event type not found.",
        data: [],
        internalStatus: "fail",
      });
    }

    const updates = {};
    if (typeof req.body.label === "string" && req.body.label.trim()) {
      updates.label = req.body.label.trim();
    }

    if (typeof req.body.key === "string" && req.body.key.trim()) {
      updates.key = slugify(req.body.key);
    }

    if (typeof req.body.back_color === "string") {
      if (!isHexColor(req.body.back_color)) {
        return res.status(400).json({
          message: "back_color must be a hex value like #1D4ED8.",
          data: [],
          internalStatus: "fail",
        });
      }
      updates.back_color = req.body.back_color;
    }

    if (typeof req.body.fore_color === "string") {
      if (!isHexColor(req.body.fore_color)) {
        return res.status(400).json({
          message: "fore_color must be a hex value like #FFFFFF.",
          data: [],
          internalStatus: "fail",
        });
      }
      updates.fore_color = req.body.fore_color;
    }

    const isHoliday = parseBoolean(req.body.is_holiday);
    if (isHoliday !== null) {
      updates.is_holiday = isHoliday;
    }

    const isActive = parseBoolean(req.body.is_active);
    if (isActive !== null) {
      updates.is_active = isActive;
    }

    if (updates.key && updates.key !== eventType.key) {
      const existingByKey = await EventType.findOne({
        where: { key: updates.key, id: { [Op.ne]: eventType.id } },
      });
      if (existingByKey) {
        return res.status(409).json({
          message: "Another event type already uses this key.",
          data: [],
          internalStatus: "fail",
        });
      }
    }

    if (updates.label && updates.label !== eventType.label) {
      const existingByLabel = await EventType.findOne({
        where: { label: updates.label, id: { [Op.ne]: eventType.id } },
      });
      if (existingByLabel) {
        return res.status(409).json({
          message: "Another event type already uses this label.",
          data: [],
          internalStatus: "fail",
        });
      }
    }

    await eventType.update(updates);

    return res.status(200).json({
      data: mapEventType(eventType),
      message: "Event type updated successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error updating event type:", error);
    return res.status(500).json({
      message: "Error updating event type.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.deleteEventTypeById = async (req, res) => {
  try {
    await ensureEventTypeSetup();

    const actor = await requireAdmin(req.userId);
    if (!actor) {
      return res.status(403).json({
        message: "Only admins can manage event types.",
        data: [],
        internalStatus: "fail",
      });
    }

    const eventTypeId = Number(req.params.typeId);
    if (!eventTypeId) {
      return res.status(400).json({
        message: "A valid event type id is required.",
        data: [],
        internalStatus: "fail",
      });
    }

    const eventType = await EventType.findByPk(eventTypeId);
    if (!eventType) {
      return res.status(404).json({
        message: "Event type not found.",
        data: [],
        internalStatus: "fail",
      });
    }

    await eventType.update({ is_active: false });

    return res.status(200).json({
      data: mapEventType(eventType),
      message: "Event type archived successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error deleting event type:", error);
    return res.status(500).json({
      message: "Error deleting event type.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.saveEvent = async (req, res) => {
  try {
    const savedEvent = await saveOrUpdateEvent({
      eventId: req.body.id ? Number(req.body.id) : null,
      payload: req.body,
      actorId: req.userId,
    });

    return res.status(200).json({
      data: [savedEvent],
      message: req.body.id
        ? "Event updated successfully."
        : "Event created successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error saving event:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Error saving event.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.fetchEventsByMonth = async (req, res) => {
  try {
    const { date } = req.params;
    const monthRange = getRangeForMonthToken(date);

    if (!monthRange) {
      return res.status(400).json({
        message: "A valid month token is required (for example 2026Apr).",
        data: [],
        internalStatus: "fail",
      });
    }

    const employeeIds = await resolveEmployeeScope(req.userId, []);

    const events = await queryEvents({
      startDate: monthRange.startDate,
      endDate: monthRange.endDate,
      employeeIds,
      search: req.query.search || "",
    });

    return res.status(200).json({
      data: events,
      message: "Events fetched successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error fetching events by month:", error);
    return res.status(500).json({
      message: "Error fetching events.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.fetchEventsByRange = async (req, res) => {
  try {
    const startDate = toDateOnly(req.query.start);
    const endDate = toDateOnly(req.query.end);

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "start and end query parameters are required.",
        data: [],
        internalStatus: "fail",
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        message: "end cannot be before start.",
        data: [],
        internalStatus: "fail",
      });
    }

    const requestedEmployeeIds = parseIdList(
      req.query.employeeIds || req.query.employee_ids,
    );
    const employeeIds = await resolveEmployeeScope(
      req.userId,
      requestedEmployeeIds,
    );

    const events = await queryEvents({
      startDate,
      endDate,
      employeeIds,
      eventTypeIds: parseIdList(
        req.query.eventTypeIds || req.query.event_type_ids,
      ),
      search: req.query.search || "",
    });

    return res.status(200).json({
      data: events,
      message: "Events fetched successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error fetching events by range:", error);
    return res.status(500).json({
      message: "Error fetching events by range.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.fetchEventReport = async (req, res) => {
  try {
    const startDate = toDateOnly(req.query.start);
    const endDate = toDateOnly(req.query.end);

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "start and end query parameters are required.",
        data: [],
        internalStatus: "fail",
      });
    }

    const requestedEmployeeIds = parseIdList(
      req.query.employeeIds || req.query.employee_ids,
    );
    const employeeIds = await resolveEmployeeScope(
      req.userId,
      requestedEmployeeIds,
    );

    const events = await queryEvents({
      startDate,
      endDate,
      employeeIds,
      eventTypeIds: parseIdList(
        req.query.eventTypeIds || req.query.event_type_ids,
      ),
      search: req.query.search || "",
    });

    const rows = events.map((event) => ({
      id: event.id,
      start: event.start,
      end_date: event.end_date,
      employee_id: event.employee_id,
      employee_name: event.Employee
        ? `${event.Employee.last_name}, ${event.Employee.first_name}`
        : "",
      event_type_id: event.event_type_id,
      event_type_label: event.event_type_label || "Other",
      details: event.long_description || "",
      title: event.title,
      is_holiday: event.is_holiday,
    }));

    const summaryByType = rows.reduce((summary, row) => {
      const key = row.event_type_label || "Other";
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});

    return res.status(200).json({
      data: {
        rows,
        summaryByType,
        total: rows.length,
      },
      message: "Event report fetched successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error fetching event report:", error);
    return res.status(500).json({
      message: "Error fetching event report.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.editEventById = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        message: "A valid event id is required.",
        data: [],
        internalStatus: "fail",
      });
    }

    const updatedEvent = await saveOrUpdateEvent({
      eventId,
      payload: req.body,
      actorId: req.userId,
    });

    return res.status(200).json({
      data: [updatedEvent],
      message: "Event updated successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Error updating event.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};

exports.deleteEventById = async (req, res) => {
  try {
    const eventId = Number(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({
        message: "A valid event id is required.",
        data: [],
        internalStatus: "fail",
      });
    }

    const actor = await Employee.findByPk(req.userId, {
      attributes: ["id", "role_id"],
    });

    if (!actor) {
      return res.status(401).json({
        message: "Authenticated employee not found.",
        data: [],
        internalStatus: "fail",
      });
    }

    const existingEvent = await Event.findByPk(eventId, {
      attributes: ["id", "employee_id"],
      include: [
        {
          model: EventMetadata,
          required: false,
          include: [{ model: EventType, required: false }],
        },
      ],
    });

    if (!existingEvent) {
      return res.status(404).json({
        message: "Event not found.",
        data: [],
        internalStatus: "fail",
      });
    }

    const isAdmin = Number(actor.role_id) === 3;
    const existingMetadata = getEventMetadataRecord(existingEvent);
    const existingEventType = getMetadataEventType(existingMetadata);
    if (!isAdmin && existingEventType?.is_holiday) {
      return res.status(403).json({
        message: "Only admins can delete holidays.",
        data: [],
        internalStatus: "fail",
      });
    }

    if (!isAdmin && Number(existingEvent.employee_id) !== Number(req.userId)) {
      return res.status(403).json({
        message: "You can only delete your own events.",
        data: [],
        internalStatus: "fail",
      });
    }

    await EventMetadata.destroy({
      where: { event_id: eventId },
    });

    const deletedRows = await Event.destroy({
      where: { id: existingEvent.id },
    });

    return res.status(200).json({
      data: [{ deletedRows }],
      message: "Event deleted successfully.",
      internalStatus: "success",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({
      message: "Error deleting event.",
      error: error.message,
      internalStatus: "fail",
    });
  }
};
