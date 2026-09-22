const express = require('express');

const router = express.Router();

const adminAuth =
  require('../middleware/adminAuth');

const {
  getAdminSummary,
  getOwners,
  getOwnerDetails,
  updateOwnerStatus,
  updateOwnerChatLimit
} = require('../controllers/adminController');

const {
  getAllPayments
} = require('../controllers/paymentController');

router.use(adminAuth);

router.get(
  '/summary',
  getAdminSummary
);

router.get(
  '/owners',
  getOwners
);

router.get(
  '/owners/:id',
  getOwnerDetails
);

router.patch(
  '/owners/:id/status',
  updateOwnerStatus
);

router.patch(
  '/owners/:id/chat-limit',
  updateOwnerChatLimit
);

router.get(
  '/payments',
  getAllPayments
);

module.exports = router;