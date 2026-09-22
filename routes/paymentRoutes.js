const express = require('express');

const router = express.Router();

const authenticateToken =
  require('../middleware/authMiddleware');

const {
  getMyPayments
} = require('../controllers/paymentController');

router.get(
  '/my',
  authenticateToken,
  getMyPayments
);

module.exports = router;