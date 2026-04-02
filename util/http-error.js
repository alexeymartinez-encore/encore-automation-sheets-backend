function createHttpError(message, statusCode = 500, data) {
  const error = new Error(message);
  error.statusCode = statusCode;

  if (data !== undefined) {
    error.data = data;
  }

  return error;
}

module.exports = {
  createHttpError,
};
