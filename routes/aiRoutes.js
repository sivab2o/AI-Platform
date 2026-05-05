const express = require('express');
const router = express.Router();

const { trainAI, getTraining, chatWithAI } = require('../controllers/aiController.js');

router.post('/train', trainAI);
router.get('/train/:userId', getTraining);
router.post('/chat', chatWithAI);

module.exports = router;