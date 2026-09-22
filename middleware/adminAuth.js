const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    return res.status(401).json({
      message: 'Authentication token is required'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      'secretkey'
    );

    const userId =
      decoded.id ||
      decoded.userId ||
      decoded.user_id;

    if (!userId) {
      return res.status(401).json({
        message: 'Invalid authentication token'
      });
    }

    User.findById(userId, (error, results) => {
      if (error) {
        console.error(
          'Admin authentication error:',
          error
        );

        return res.status(500).json({
          message: 'Unable to authenticate administrator'
        });
      }

      if (!results || results.length === 0) {
        return res.status(401).json({
          message: 'User account not found'
        });
      }

      const user = results[0];

      if (user.status !== 'active') {
        return res.status(403).json({
          message: 'This account is inactive'
        });
      }

      if (user.role !== 'admin') {
        return res.status(403).json({
          message: 'Administrator access is required'
        });
      }

      req.admin = user;
      next();
    });
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired authentication token'
    });
  }
};

module.exports = adminAuth;