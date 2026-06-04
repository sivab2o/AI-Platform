const express = require('express');
const router = express.Router();

const { getDashboardStats, trainAI, saveMasterAI, getTraining, chatWithAI, updateLang, getLang, getConversations, registerGuest, guestChat, checkOwner, checkGuest, getGuestConversationsByGuestId, getAISuggestions, getClients, getQuestions, saveQuestion, updateQuestion, deleteQuestion} = require('../controllers/aiController.js');
const { translateText } = require('../controllers/translateController.js');

router.get('/dashboard/stats/:userId', getDashboardStats);
router.post('/train', trainAI);
router.post('/train/master', saveMasterAI);
router.get('/train/:userId', getTraining);
router.post('/chat', chatWithAI);
router.post('/translate', translateText);
router.put('/user/lang/:userId', updateLang);
router.get('/user/lang/:userId', getLang);
router.get('/conversations/:userId', getConversations);
router.post('/guest/register', registerGuest);
router.post('/guest/chat', guestChat);
router.get('/owner/check/:ownerId', checkOwner);
router.post('/guest/check', checkGuest);
router.get('/guest/conversations/:guestId', getGuestConversationsByGuestId);
router.post('/guest/suggestions', getAISuggestions);
router.get('/clients/:userId', getClients);
router.get('/questions/:ownerId', getQuestions);
router.post('/questions', saveQuestion);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

module.exports = router;