const express = require('express');
const router = express.Router();
const { handleMessage } = require('../controllers/whatsappController.js');

router.post('/webhook', handleMessage);

module.exports = router;