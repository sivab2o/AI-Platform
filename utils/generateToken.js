// utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, 'secretkey', { expiresIn: '1h' });
};

module.exports = generateToken;