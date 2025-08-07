const moment = require("moment");

function parseToDate(dateInput) {
  if (!dateInput) return null;

  // If already a Date object
  if (Object.prototype.toString.call(dateInput) === "[object Date]") {
    return dateInput;
  }

  // If it's a native JS Date string (like "Sun Aug 10 2025 14:49:40 GMT-0400")
  const nativeParsed = new Date(dateInput);
  if (!isNaN(nativeParsed.getTime())) {
    return nativeParsed;
  }

  // Try ISO
  const isoParsed = moment(dateInput, moment.ISO_8601, true);
  if (isoParsed.isValid()) {
    return isoParsed.toDate();
  }

  // Try US format
  const usParsed = moment(dateInput, "MM/DD/YYYY", true);
  if (usParsed.isValid()) {
    return usParsed.toDate();
  }

  throw new Error(`Invalid date format: ${dateInput}`);
}

module.exports = { parseToDate };
