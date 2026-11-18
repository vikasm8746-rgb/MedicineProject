const { sendError } = require('../utils/helpers');

/**
 * Role-Based Access Control Middleware
 * Restricts access to users with specified roles
 * @param  {...string} roles Allowed roles (e.g. 'pharmacy_owner', 'admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource`,
        403
      );
    }

    next();
  };
};

module.exports = {
  authorize,
};

