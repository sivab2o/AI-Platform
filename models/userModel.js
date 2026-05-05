// models/userModel.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  // Method to find a user by email
  findByEmail: (email, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], callback);
  },

  // Method to create a new user
  createUser: (name, email, mobile, password, callback) => {
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) return callback(err);

      const sql = 'INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)';
      db.query(sql, [name, email, mobile, hashedPassword], callback);
    });
  }
};

module.exports = User;