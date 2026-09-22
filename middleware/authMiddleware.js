const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authenticateToken = (req, res, next) => {
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
      process.env.JWT_SECRET || 'secretkey'
    );

    const databaseUserId =
      decoded.id ||
      decoded.userId;

    if (!databaseUserId) {
      return res.status(401).json({
        message: 'Invalid authentication token'
      });
    }

    User.findById(
      databaseUserId,
      (error, results) => {
        if (error) {
          console.error(
            'Authentication error:',
            error
          );

          return res.status(500).json({
            message: 'Unable to authenticate user'
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

        req.user = user;
        next();
      }
    );
  } catch (error) {
    return res.status(401).json({
      message:
        'Invalid or expired authentication token'
    });
  }
};

module.exports = authenticateToken;