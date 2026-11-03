const { sendErrorResponse, sendSuccessResponse } = require('../utils/response');
const repository = require('../repositories/user');

exports.loginRequired = async (req, res, next) => {
  if (!req.session.user) {
    // 401, not 500. "You are not signed in" is a state the client is expected to handle —
    // gate the screen, remember where it was, send the user to sign in — and a 500 tells
    // it the opposite: that the server broke and the request should be retried. The
    // rebuilt client keyed off this distinction (hooks/useSignedIn, the checkout gate), so
    // a signed-out visitor used to be reported as an outage.
    return sendErrorResponse(res, 'LOGIN_REQUIRED', {}, 401);
  }
  const user = await repository.findUserById(req.session.user);
  if (!user) {
    return sendErrorResponse(res, 'USER_NOT_FOUND', {}, 404);
  }
  req.user = user;
  return next();
};

// destroy session
exports.destroySession = (req, res, next) => {
  req.session.destroy((err) => {
    return sendSuccessResponse(res, 'LOGOUT_USER_SUCCESS', {});
  });
};
