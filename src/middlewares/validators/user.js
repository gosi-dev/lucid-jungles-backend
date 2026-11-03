const Joi = require('joi');
const { handleValidationError } = require('../../utils/response');

const registerPayloadValidation = (payload) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    username: Joi.string().required().min(3).max(30),
    refToken: Joi.string(),
  }).required();
  return schema.validate(payload, { allowUnknown: false });
};

exports.validateRegisterPayload = (req, res, next) => {
  const validated = registerPayloadValidation(req.body);
  if (validated.error) {
    return handleValidationError(validated, res);
  }
  return next();
};

const loginPayloadValidation = (payload) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }).required();
  return schema.validate(payload, { allowUnknown: false });
};

exports.validateLoginPayload = (req, res, next) => {
  const validated = loginPayloadValidation(req.body);
  if (validated.error) {
    return handleValidationError(validated, res);
  }
  return next();
};

const updateProfilePayloadValidation = (payload) => {
  const schema = Joi.object({
    email: Joi.string().allow(null, ''),
    username: Joi.string().allow(null, ''),
    profile_picture:Joi.string().allow(null, ''),
  }).required();
  return schema.validate(payload, { allowUnknown: false });
};

exports.validateUpdateProfilePayload = (req, res, next) => {
  const validated = updateProfilePayloadValidation(req.body);
  if (validated.error) {
    return handleValidationError(validated, res);
  }
  return next();
};

const updatePaswordPayloadValidation = (payload) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
  }).required();
  return schema.validate(payload, { allowUnknown: false });
};

exports.validateUpdatePasswordPayload = (req, res, next) => {
  const validated = updatePaswordPayloadValidation(req.body);
  if (validated.error) {
    return handleValidationError(validated, res);
  }
  return next();
};

const recoverPaswordPayloadValidation = (payload) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  }).required();
  return schema.validate(payload, { allowUnknown: false });
};

exports.validateRecoverPasswordPayload = (req, res, next) => {
  const validated = recoverPaswordPayloadValidation(req.body);
  if (validated.error) {
    return handleValidationError(validated, res);
  }
  return next();
};

const resetPaswordPayloadValidation = (payload) => {
  const schema = Joi.object({
    recoveryToken: Joi.string().required(),
    newPassword: Joi.string().required(),
  }).required();
  return schema.validate(payload, { allowUnknown: false });
};

exports.validateResetPasswordPayload = (req, res, next) => {
  const validated = resetPaswordPayloadValidation(req.body);
  if (validated.error) {
    return handleValidationError(validated, res);
  }
  return next();
};
