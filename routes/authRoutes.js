// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Signup route
router.post( '/signup/create-order', authController.createSignupOrder );

router.post( '/signup/verify-payment', authController.verifySignupPayment );

// Login route
router.post('/login', authController.login);

module.exports = router;