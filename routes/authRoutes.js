// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Signup route
router.post( '/signup/create-order', authController.createSignupOrder );

router.post( '/signup/verify-payment', authController.verifySignupPayment );

// Login route
router.post('/login', authController.login);

// Send password reset verification code
router.post(
  '/forgot-password',
  authController.forgotPassword
);

// Verify code and save new password
router.post(
  '/reset-password',
  authController.resetPassword
);

module.exports = router;