// controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const { log } = require('node:console');

// Controller for user registration (signup)
const signup = (req, res) => {

  console.log("yes");

  const { name, email, mobile, password } = req.body;

  console.log(req.body);


  // Check if user already exists
  User.findByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error checking email' });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create new user
    User.createUser(name, email, mobile, password, (err, result) => {
      if (err) return res.status(500).json({ error: 'Error creating user' });

      res.status(201).json({ message: 'User created successfully' });
    });
  });
};

// Controller for user login
const login = (req, res) => {
  const { email, password } = req.body;

  console.log(req.body);


  // Check if user exists
  User.findByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error fetching user' });

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    bcrypt.compare(password, results[0].password, (err, match) => {
      if (err) return res.status(500).json({ error: 'Error comparing password' });

      if (!match) return res.status(400).json({ message: 'Invalid credentials' });

      // Generate JWT token
      const token = generateToken(results[0].id);

      const user = results[0];

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile
        }
      });
    });
  });
};

module.exports = {
  signup,
  login
};