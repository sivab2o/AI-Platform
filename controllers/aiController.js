const AIModel = require('../models/aiModel.js');

// ✅ Strip HTML tags from CKEditor content
const stripHtml = (html) => {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
};

const trainAI = (req, res) => {
    const { userId, name, email, mobile, trainingData } = req.body;

    if (!trainingData || trainingData.trim() === '') {
        return res.status(400).json({ message: 'Training data required' });
    }

    AIModel.saveTraining({ userId, name, email, mobile, trainingData }, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Failed to save training' });
        }
        res.status(200).json({ message: 'Training data saved successfully' });
    });
};

const saveMasterAI = (req, res) => {
    const { userId, masterData } = req.body;
    AIModel.saveMasterTraining(userId, masterData, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save master training' });
        res.json({ message: 'Master training saved' });
    });
};

const getTraining = (req, res) => {
    const userId = req.params.userId;
    AIModel.getTrainingByUser(userId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error fetching training data' });
        if (results.length > 0) return res.status(200).json(results[0]);
        else return res.status(200).json(null);
    });
};

const chatWithAI = (req, res) => {
    const { userId, message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ message: 'Message required' });
    }

    AIModel.getTrainingData(userId, async (err, results) => {
        if (err) return res.status(500).json({ error: 'Error fetching training data' });
        if (results.length === 0) return res.status(400).json({ message: 'AI not trained yet' });

        const basicData = results[0].training_data || '';
        const masterRaw = results[0].master_data || '';
        const masterData = stripHtml(masterRaw); // ✅ Strip HTML
        const combinedData = basicData + (masterData ? '\n\nAdditional Instructions:\n' + masterData : '');

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a business assistant for this specific business.

Here is the business training data:
${combinedData}

STRICT RULES:
1. ONLY answer questions related to this business.
2. If someone asks anything NOT related to this business, respond with: "I can only help with questions about our business. Please ask me about our services, pricing, or how we can help you!"
3. Never answer questions about other companies, world events, or general facts.
4. Always be polite and redirect non-business questions back to the business.
5. Reply in the same language the customer uses.`
                    },
                    { role: 'user', content: message }
                ]
            });

            const reply = aiResponse.choices[0].message.content;

            AIModel.saveChat(userId, message, reply, 'chat', (err2) => {
                if (err2) console.log('Save chat error:', err2);
            });

            res.status(200).json({ reply });

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'AI response failed' });
        }
    });
};

const getConversations = (req, res) => {
    const userId = req.params.userId;
    AIModel.getConversations(userId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error fetching conversations' });
        res.json(results);
    });
};

const updateLang = (req, res) => {
    const { userId } = req.params;
    const { lang } = req.body;
    AIModel.updateUserLang(userId, lang, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update language' });
        res.json({ message: 'Language updated successfully' });
    });
};

const getLang = (req, res) => {
    const { userId } = req.params;
    AIModel.getUserLang(userId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to get language' });
        res.json({ lang: results[0]?.lang || 'en' });
    });
};

const registerGuest = (req, res) => {
    const { name, email, mobile, ownerId } = req.body;
    AIModel.registerGuest(name, email, mobile, ownerId, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Failed to register guest' });
        }
        res.json({ guestId: result.insertId, message: 'Registered successfully' });
    });
};

const guestChat = (req, res) => {
    const { ownerId, guestId, guestName, message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ message: 'Message required' });
    }

    AIModel.getTrainingData(ownerId, async (err, results) => {
        if (err) return res.status(500).json({ error: 'Error fetching training data' });
        if (results.length === 0) return res.status(400).json({ message: 'AI not trained yet' });

        const basicData = results[0].training_data || '';
        const masterRaw = results[0].master_data || '';
        const masterData = stripHtml(masterRaw); // ✅ Strip HTML
        const combinedData = basicData + (masterData ? '\n\nAdditional Instructions:\n' + masterData : '');

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a business assistant for this specific business.

Here is the business training data:
${combinedData}

STRICT RULES:
1. ONLY answer questions related to this business.
2. If someone asks anything NOT related, respond: "I can only help with questions about our business."
3. Always be polite and friendly.
4. Reply in the same language the customer uses.`
                    },
                    { role: 'user', content: message }
                ]
            });

            const reply = aiResponse.choices[0].message.content;

            AIModel.saveGuestChat(ownerId, guestId, guestName, message, reply, (err2) => {
                if (err2) console.log('Save guest chat error:', err2);
            });

            res.status(200).json({ reply });

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'AI response failed' });
        }
    });
};

const checkOwner = (req, res) => {
    const ownerId = req.params.ownerId;
    AIModel.getTrainingData(ownerId, (err, results) => {
        if (err) return res.status(500).json({ valid: false });
        if (results.length > 0 && results[0].training_data) {
            return res.status(200).json({ valid: true });
        } else {
            return res.status(200).json({ valid: false });
        }
    });
};

const checkGuest = (req, res) => {
    const { email, mobile, ownerId } = req.body;
    AIModel.findGuest(email, mobile, ownerId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error checking guest' });
        if (results.length > 0) {
            return res.json({ exists: true, guestId: results[0].id, name: results[0].name });
        } else {
            return res.json({ exists: false });
        }
    });
};

const getGuestConversationsByGuestId = (req, res) => {
    const guestId = req.params.guestId;
    AIModel.getGuestConversationsByGuestId(guestId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error fetching conversations' });
        res.json(results);
    });
};

const getAISuggestions = (req, res) => {
    const { ownerId } = req.body;

    AIModel.getTrainingData(ownerId, async (err, results) => {
        if (err || results.length === 0) {
            return res.json({ suggestions: [] });
        }

        const basicData = results[0].training_data || '';
        const masterRaw = results[0].master_data || '';
        const masterData = stripHtml(masterRaw); // ✅ Strip HTML
        const combinedData = basicData + (masterData ? '\n\nAdditional Info:\n' + masterData : '');

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Based on this business training data, generate exactly 6 short common questions a customer might ask. Return ONLY a JSON array of strings. No explanation, no extra text.
Example: ["What services do you offer?", "What is your pricing?"]

Training data:
${combinedData}`
                    },
                    {
                        role: 'user',
                        content: 'Generate 6 customer questions.'
                    }
                ]
            });

            const content = aiResponse.choices[0].message.content;
            const suggestions = JSON.parse(content);
            res.json({ suggestions });

        } catch (error) {
            console.log(error);
            res.json({ suggestions: [] });
        }
    });
};

const getDashboardStats = (req, res) => {
    const { userId } = req.params;
    AIModel.getDashboardStats(userId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to get stats' });
        const stats = results[0];
        const total = parseInt(stats.totalConversations) || 0;
        const clients = parseInt(stats.totalClients) || 0;

        // ✅ Hot = guests with more than 3 conversations
        // ✅ Cold = guests with 1-2 conversations
        const hotSql = `
            SELECT COUNT(*) as hot FROM (
                SELECT guest_id, COUNT(*) as cnt
                FROM guest_conversations
                WHERE owner_id = ?
                GROUP BY guest_id
                HAVING cnt >= 3
            ) t
        `;
        const coldSql = `
            SELECT COUNT(*) as cold FROM (
                SELECT guest_id, COUNT(*) as cnt
                FROM guest_conversations
                WHERE owner_id = ?
                GROUP BY guest_id
                HAVING cnt < 3
            ) t
        `;

        const db = require('../config/db');
        db.query(hotSql, [userId], (err2, hotRes) => {
            if (err2) return res.status(500).json({ error: 'Failed' });
            db.query(coldSql, [userId], (err3, coldRes) => {
                if (err3) return res.status(500).json({ error: 'Failed' });
                res.json({
                    totalConversations: total,
                    totalClients: clients,
                    hotConversations: parseInt(hotRes[0].hot) || 0,
                    coldConversations: parseInt(coldRes[0].cold) || 0
                });
            });
        });
    });
};

const getClients = (req, res) => {
    const { userId } = req.params;
    AIModel.getClients(userId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to get clients' });
        res.json(results);
    });
};

const getQuestions = (req, res) => {
    const { ownerId } = req.params;
    AIModel.getQuestions(ownerId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to get questions' });
        const questions = results.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : []
        }));
        res.json(questions);
    });
};

const saveQuestion = (req, res) => {
    const data = req.body;
    AIModel.saveQuestion(data, (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to save question' });
        res.json({ id: result.insertId, message: 'Question saved' });
    });
};

const updateQuestion = (req, res) => {
    const { id } = req.params;
    const data = req.body;
    AIModel.updateQuestion(id, data, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update question' });
        res.json({ message: 'Question updated' });
    });
};

const deleteQuestion = (req, res) => {
    const { id } = req.params;
    AIModel.deleteQuestion(id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete question' });
        res.json({ message: 'Question deleted' });
    });
};

module.exports = {
    trainAI,
    saveMasterAI,
    getTraining,
    chatWithAI,
    updateLang,
    getLang,
    getConversations,
    registerGuest,
    guestChat,
    checkOwner,
    checkGuest,
    getGuestConversationsByGuestId,
    getAISuggestions,
    getDashboardStats,
    getClients,
    getQuestions, 
    saveQuestion, 
    updateQuestion, 
    deleteQuestion
};