const express = require('express');
const router = express.Router();

const { trainAI, getTraining, chatWithAI, updateLang, getLang } = require('../controllers/aiController.js');
const { translateText } = require('../controllers/translateController.js');

router.post('/train', trainAI);
router.get('/train/:userId', getTraining);
router.post('/chat', chatWithAI);
router.post('/translate', translateText);
router.put('/user/lang/:userId', updateLang);
router.get('/user/lang/:userId', getLang);

module.exports = router;