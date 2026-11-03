const message = require('../lang/eng.json');

const getMessage = (key) => {
  return message[key];
};

exports.makeResponse = (status, message, data) => {
  if (status) {
    return {
      status,
      message: message,
      data: data,
    };
  }
  return {
    status,
    message: message,
    data: data,
  };
};

exports.sendSuccessResponse = (res, message, data, statusCode = 200) => {
  return res.status(statusCode).json({
    status: true,
    message: getMessage(message) || message,
    data: data,
  });
};

const sendErrorResponse = (res, message, data, statusCode = 400) => {
  return res.status(statusCode).json({
    status: false,
    message: getMessage(message) || message,
    data: data,
  });
};

exports.sendErrorResponse = (res, message, data, statusCode = 400) => {
  return res.status(statusCode).json({
    status: false,
    message: getMessage(message) || message,
    data: data,
  });
};

exports.handleValidationError = (validatedData, res) => {
  const message = validatedData.error.details[0].message;
  return sendErrorResponse(res, message, {}, 400);
};
