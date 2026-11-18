const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { sendError } = require('../utils/helpers');

/**
 * Protect routes - Verifies JWT Bearer token
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'medifind_jwt_secret_dev_key_healthcare_secure_2026'
      );

      // Fetch user from DB (excluding password)
      const users = await query(
        'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
        [decoded.id]
      );

      if (!users || users.length === 0) {
        return sendError(res, 'User not found or authorization revoked', 401);
      }

      req.user = users[0];
      next();
    } catch (error) {
      console.error('JWT Auth Error:', error.message);
      return sendError(res, 'Invalid or expired authorization token', 401);
    }
  } else {
    return sendError(res, 'Authorization token required in Bearer header', 401);
  }
};

/**
 * Optional Authentication - parses token if provided, but doesn't block if missing
 */
const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'medifind_jwt_secret_dev_key_healthcare_secure_2026'
      );
      const users = await query(
        'SELECT id, name, email, phone, role FROM users WHERE id = ?',
        [decoded.id]
      );
      if (users && users.length > 0) {
        req.user = users[0];
      }
    } catch (error) {
      // Ignore token failure for optional routes
    }
  }
  next();
};

module.exports = {
  protect,
  optionalAuth,
};

