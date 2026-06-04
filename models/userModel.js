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
    if (err) {
      console.log(err);
      return callback(err);
    }

    // First insert user
    const sql = 'INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)';

    db.query(sql, [name, email, mobile, hashedPassword], (err, result) => {

      if (err) {
        return callback(err);
      }

      // Get inserted auto increment id
      const insertedId = result.insertId;

      // Create custom user_id
      const customUserId = 'LF' + insertedId;

      // Update user_id column
      const updateSql = 'UPDATE users SET user_id = ? WHERE id = ?';

      db.query(updateSql, [customUserId, insertedId], (err, updateResult) => {

        if (err) {
          return callback(err);
        }

        callback(null, updateResult);
      });
    });
  });
}
};

module.exports = User;