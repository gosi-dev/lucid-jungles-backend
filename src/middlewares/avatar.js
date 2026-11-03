const Joi = require('joi');
const { handleValidationError } = require('../utils/response');

const uploadAvatarPayloadValidation = (payload) => {
  const schema = Joi.object({
    location: Joi.string().required().messages({
      'string.empty': 'FILE_UPLOAD_REQUIRED',
      'string.required': 'FILE_UPLOAD_REQUIRED',
    }),
  })
    .required()
    .messages({
      'object.length': 'FILE_UPLOAD_REQUIRED',
      'any.required': 'FILE_UPLOAD_REQUIRED',
    });

  return schema.validate(payload, { allowUnknown: true });
};

exports.validateUploadAvatarPayload = (req, res, next) => {
  const validated = uploadAvatarPayloadValidation(req.file);
  if (validated.error) {
    return handleValidationError(validated, res);
  }
  return next();
};
