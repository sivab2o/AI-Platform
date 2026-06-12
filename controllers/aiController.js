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
                        content: `You are an AI Employee for this specific business only.

Here is your complete training data:
${combinedData}

STRICT RULES — YOU MUST FOLLOW ALL:
1. ONLY answer questions directly related to this business and its products/services.
2. If a customer asks ANYTHING not related to this business, respond EXACTLY: "I can only help with questions about our business. Please ask me about our services, products, or how we can help you!"
3. NEVER answer general knowledge questions, world events, science, math, jokes, or any topic outside this business.
4. NEVER make up information not present in your training data.
5. If you don't know the answer, say: "I don't have that information right now. Please contact us directly for more details."
6. Always be polite, professional, and helpful within the scope of this business.
7. Reply in the same language the customer uses.`
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
        const masterData = stripHtml(masterRaw);
        const combinedData = basicData + (masterData ? '\n\nAdditional Instructions:\n' + masterData : '');

        // ✅ Current date/time/day info (server local time)
        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayNames[now.getDay()];
        const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const currentDateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // ✅ Parse Working Days from training data
        let workingDays = [];
        const workingDaysMatch = basicData.match(/Working Days:\s*(.+)/i);
        if (workingDaysMatch) {
            workingDays = workingDaysMatch[1].split(',').map(d => d.trim());
        }

        // ✅ Parse Office Opening/Closing Time
        let openTime = null, closeTime = null;
        const openMatch = basicData.match(/Office Opening Time:\s*(\d{1,2}:\d{2})/i);
        const closeMatch = basicData.match(/Office Closing Time:\s*(\d{1,2}:\d{2})/i);
        if (openMatch) openTime = openMatch[1];
        if (closeMatch) closeTime = closeMatch[1];

        // ✅ Determine if business is currently OPEN
        let isWorkingDay = workingDays.length === 0 ? true : workingDays.includes(currentDay);
        let isWithinHours = true;
        if (openTime && closeTime) {
            const toMinutes = (t) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            isWithinHours = nowMinutes >= toMinutes(openTime) && nowMinutes <= toMinutes(closeTime);
        }
        const isBusinessOpenNow = isWorkingDay && isWithinHours;

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            // ✅ Load previous conversation history
            let conversationHistory = [];
            await new Promise((resolve) => {
                AIModel.getGuestConversationsByGuestId(guestId, (err, history) => {
                    if (!err && history && history.length > 0) {
                        const recent = history.slice(-10);
                        recent.forEach(conv => {
                            conversationHistory.push({ role: 'user', content: conv.message });
                            conversationHistory.push({ role: 'assistant', content: conv.reply });
                        });
                    }
                    resolve(true);
                });
            });

            // ✅ Was this the FIRST message of the entire conversation (before adding current msg)?
            const isFirstMessageOfSession = conversationHistory.length === 0;

            // ✅ Add current message
            conversationHistory.push({ role: 'user', content: message });

            // ✅ Build a hard status line that CANNOT be ignored
            let availabilityStatus = '';
            if (!isBusinessOpenNow) {
                if (!isWorkingDay) {
                    availabilityStatus = `BUSINESS STATUS: CLOSED TODAY. Today is ${currentDay}, which is NOT a working day for this business. Working days are: ${workingDays.join(', ') || 'N/A'}.`;
                } else {
                    availabilityStatus = `BUSINESS STATUS: CLOSED RIGHT NOW (outside office hours). Current time is ${currentTime}. Office hours are ${openTime || 'N/A'} to ${closeTime || 'N/A'} on working days (${workingDays.join(', ') || 'N/A'}).`;
                }
            } else {
                availabilityStatus = `BUSINESS STATUS: OPEN RIGHT NOW. Today is ${currentDay} and current time is ${currentTime}, within office hours (${openTime || 'N/A'} - ${closeTime || 'N/A'}).`;
            }

            // ✅ Mention-closed instruction — only on first message of session
            let availabilityInstruction = '';
            if (!isBusinessOpenNow) {
                if (isFirstMessageOfSession) {
                    availabilityInstruction = `${availabilityStatus}

AVAILABILITY RULE (MANDATORY for this FIRST reply only):
1. The "BUSINESS STATUS" above is computed by the system and is ALWAYS TRUE.
2. Since the business is currently closed, mention this ONCE naturally in this reply — e.g. "Note: Today (${currentDay}) we're closed / outside office hours, but here's the info you asked..." — then still answer the customer's question helpfully and mention working days/hours.
3. Do NOT claim the business is open.`;
                } else {
                    availabilityInstruction = `${availabilityStatus}

AVAILABILITY RULE (for this reply):
1. The business is currently closed (see status above), but you already informed the customer about this earlier in this conversation.
2. Do NOT repeat the "we are closed" notice again in this reply. Just answer their question normally and helpfully.
3. Only mention closed/working hours again if the customer specifically asks about availability, timing, or "are you open" again.`;
                }
            } else {
                availabilityInstruction = `${availabilityStatus}

AVAILABILITY RULE:
1. The business is currently open. No need to mention status — reply normally.`;
            }

            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an AI Employee for this specific business only. Your name is the AI Employee Name from training data.

Here is your complete training data:
${combinedData}

CUSTOMER INFO:
- The customer's name is: ${guestName || 'the customer'}

CURRENT DATE & TIME:
- Today is: ${currentDateStr}
- Current day: ${currentDay}
- Current time: ${currentTime}

${availabilityInstruction}

CUSTOMER ADDRESSING RULE (VERY IMPORTANT):
1. Check "How should the AI address customers?" in the training data.
2. If it says "By Customer Name", address the customer by their name (${guestName || 'the customer'}) naturally in your replies — for example in greetings, when confirming details, or when transferring to a human.
3. If "Can AI call customer by name repeatedly?" is "No", use the customer's name only occasionally (e.g. first reply or important moments), not in every single message.
4. If addressing style is something other than "By Customer Name" (e.g. "Friend", "Boss", "Dear Customer"), use that style consistently instead.

LANGUAGE RULES (FOLLOW EXACTLY):
1. Look ONLY at the customer's MOST RECENT message to decide the reply language and script.
2. If that message is written in Tamil script (e.g. வணக்கம், எப்படி இருக்கீங்க), reply ENTIRELY in Tamil script. Do not translate to English. Do not add English sentences.
3. If that message is written in Tanglish (Tamil words typed using English letters, e.g. "vanakkam epdi irukinga"), reply in Tanglish the same way.
4. If that message is written in English, reply in English.
5. If that message is in Hindi, Telugu, or any other language/script, reply in that same language and script.
6. This applies to EVERY reply, including the very first reply and short greetings.
7. Training data being in English does NOT mean replies must be in English — reply language depends only on the customer's current message.
8. Never ask the customer what language they prefer. Never mention language.
9. If the customer switches language in a later message, switch your reply to match that new message.
10. Keep product names, brand names, and numbers in their original form regardless of reply language.

STRICT BUSINESS RULES:
1. ONLY answer questions directly related to this business and its products/services.
2. NEVER answer general knowledge questions, world events, science, math, jokes.
3. NEVER make up information not present in your training data.
4. Always be polite, professional, and helpful.
5. Use the communication style defined in training data.
6. Follow response length setting from training data.
7. Use closing style ONLY at the very end of a completed conversation — NOT after every message.
8. If customer shows purchase intent or needs human help, provide responsible person contact.
9. Remember the conversation context — do not ask for information already provided.
10. If customer is in middle of scheduling appointment, continue that flow — do not restart.
11. If customer provides their name or number, acknowledge and continue the task.`
                    },
                    ...conversationHistory
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
        const masterData = stripHtml(masterRaw);
        const combinedData = basicData + (masterData ? '\n\nAdditional Info:\n' + masterData : '');

        // ✅ Extract preferred language
        let preferredLang = 'en';
        const langMatch = basicData.match(/Preferred Language:\s*(.+)/i);
        if (langMatch) {
            const langName = langMatch[1].trim().toLowerCase();
            const langMap = {
                'tamil': 'ta', 'english': 'en', 'hindi': 'hi',
                'telugu': 'te', 'malayalam': 'ml', 'kannada': 'kn',
                'sinhala': 'si', 'arabic': 'ar', 'french': 'fr',
                'german': 'de', 'spanish': 'es', 'portuguese': 'pt',
                'japanese': 'ja', 'chinese': 'zh', 'korean': 'ko',
                'thai': 'th', 'vietnamese': 'vi', 'indonesian': 'id',
                'malay': 'ms', 'bengali': 'bn', 'urdu': 'ur'
            };
            preferredLang = langMap[langName] || 'en';
        }

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            // ✅ Generate suggestions in English first
            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Based on this business training data, generate exactly 6 short common questions a customer might ask in English. Return ONLY a JSON array of strings. No explanation, no extra text.
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

            // ✅ If English, return directly
            if (preferredLang === 'en') {
                return res.json({ suggestions });
            }

            // ✅ Translate all suggestions using Google Translate
            const axiosLib = require('axios');
            const apiKey = process.env.GOOGLE_TRANSLATE_KEY;

            const translateRes = await axiosLib.post(
                `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
                {
                    q: suggestions,
                    source: 'en',
                    target: preferredLang,
                    format: 'text'
                }
            );

            const translated = translateRes.data.data.translations.map(
                (t) => t.translatedText
            );

            res.json({ suggestions: translated });

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
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

const getQuestions = (req, res) => {
    const { ownerId } = req.params;
    AIModel.getQuestions(ownerId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to get questions' });
        const questions = results.map(q => {
            let options = [];
            try {
                if (!q.options) {
                    options = [];
                } else if (Array.isArray(q.options)) {
                    // ✅ Already parsed by mysql2
                    options = q.options;
                } else if (typeof q.options === 'string') {
                    options = JSON.parse(q.options);
                } else {
                    options = [];
                }
            } catch (e) {
                options = [];
            }
            return { ...q, options };
        });
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

const guestWelcome = async (req, res) => {
    const { ownerId, guestName, returning } = req.body;

    AIModel.getTrainingData(ownerId, async (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ error: 'Training data not found' });
        }

        const basicData = results[0].training_data || '';
        const masterRaw = results[0].master_data || '';
        const masterData = stripHtml(masterRaw);

        // ✅ Extract values
        let preferredLang = 'en';
        const langMatch = basicData.match(/Preferred Language:\s*(.+)/i);
        if (langMatch) {
            const langName = langMatch[1].trim().toLowerCase();
            // ✅ Map language name to Google language code
            const langMap = {
                'tamil': 'ta',
                'english': 'en',
                'hindi': 'hi',
                'telugu': 'te',
                'malayalam': 'ml',
                'kannada': 'kn',
                'sinhala': 'si',
                'arabic': 'ar',
                'french': 'fr',
                'german': 'de',
                'spanish': 'es',
                'portuguese': 'pt',
                'japanese': 'ja',
                'chinese': 'zh',
                'korean': 'ko',
                'thai': 'th',
                'vietnamese': 'vi',
                'indonesian': 'id',
                'malay': 'ms',
                'bengali': 'bn',
                'urdu': 'ur',
                'marathi': 'mr',
                'gujarati': 'gu',
                'punjabi': 'pa',
                'odia': 'or'
            };
            preferredLang = langMap[langName] || 'en';
        }

        let aiName = 'AI Assistant';
        const aiNameMatch = basicData.match(/AI Employee Name:\s*(.+)/i);
        if (aiNameMatch) aiName = aiNameMatch[1].trim();

        let businessName = 'our company';
        const bizNameMatch = basicData.match(/Business Name:\s*(.+)/i);
        if (bizNameMatch) businessName = bizNameMatch[1].trim();

        // ✅ Build intro script
        let introScript = `Hi, I am ${aiName}, AI Assistant for ${businessName}. How can I help you today?`;
        const introMatch = basicData.match(/AI Introduction Script:\s*(.+)/i);
        if (introMatch) {
            introScript = introMatch[1].trim()
                .replace(/{AI Name}/gi, aiName)
                .replace(/{Company Name}/gi, businessName)
                .replace(/{Customer Name}/gi, guestName);
        }

        const messageToTranslate = returning
            ? `Welcome back ${guestName}! ${introScript}`
            : introScript;

        // ✅ If English, return directly
        if (preferredLang === 'en') {
            return res.json({ reply: messageToTranslate });
        }

        try {
            // ✅ Use Google Translate API
            const axios = require('axios');
            const apiKey = process.env.GOOGLE_TRANSLATE_KEY;

            // ✅ Replace proper nouns with placeholders before translation
            const placeholders = {};
            let textToTranslate = messageToTranslate;

            // ✅ Protect business name
            const bizPlaceholder = `BIZNAME123`;
            textToTranslate = textToTranslate.replace(new RegExp(businessName, 'gi'), bizPlaceholder);
            placeholders[bizPlaceholder] = businessName;

            // ✅ Protect AI name
            const aiPlaceholder = `AINAME456`;
            textToTranslate = textToTranslate.replace(new RegExp(aiName, 'gi'), aiPlaceholder);
            placeholders[aiPlaceholder] = aiName;

            // ✅ Protect customer name
            const custPlaceholder = `CUSTNAME789`;
            textToTranslate = textToTranslate.replace(new RegExp(guestName, 'gi'), custPlaceholder);
            placeholders[custPlaceholder] = guestName;

            const translateRes = await axios.post(
                `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
                {
                    q: textToTranslate,
                    source: 'en',
                    target: preferredLang,
                    format: 'text'
                }
            );

            let translated = translateRes.data.data.translations[0].translatedText;

            // ✅ Restore proper nouns
            Object.keys(placeholders).forEach(placeholder => {
                translated = translated.replace(new RegExp(placeholder, 'gi'), placeholders[placeholder]);
            });

            res.json({ reply: translated });

        } catch (error) {
            console.log('Translation error:', error);
            // ✅ Fallback to original
            res.json({ reply: messageToTranslate });
        }
    });
};

const extractFileText = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const fileName = req.file.originalname.toLowerCase();
        const buffer = req.file.buffer;
        let extractedText = '';

        console.log('Extracting file:', fileName);

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const XLSX = require('xlsx');
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const csv = XLSX.utils.sheet_to_csv(sheet);
                extractedText += `--- Sheet: ${sheetName} ---\n${csv}\n\n`;
            });

        } else if (fileName.endsWith('.csv')) {
            extractedText = buffer.toString('utf8');

        } else if (fileName.endsWith('.pdf')) {
            try {
                const pdfParse = require('pdf-parse');
                const data = await pdfParse(buffer);
                extractedText = data.text;
                console.log('PDF extracted:', extractedText.length, 'chars');
            } catch (pdfErr) {
                console.error('PDF error:', pdfErr.message);
                extractedText = '[PDF extraction failed: ' + pdfErr.message + ']';
            }

        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            try {
                const mammoth = require('mammoth');
                const result = await mammoth.extractRawText({ buffer });
                extractedText = result.value;
                console.log('DOCX extracted:', extractedText.length, 'chars');
            } catch (docErr) {
                console.error('DOCX error:', docErr.message);
                extractedText = '[DOCX extraction failed: ' + docErr.message + ']';
            }

        } else if (fileName.endsWith('.txt')) {
            extractedText = buffer.toString('utf8');

        } else {
            extractedText = '[Unsupported file type: ' + fileName + ']';
        }

        if (!extractedText.trim()) {
            extractedText = '[No text content found in file]';
        }

        res.json({ text: extractedText });

    } catch (error) {
        console.error('File extract error:', error.message);
        res.status(500).json({ error: 'Failed: ' + error.message });
    }
};

const fetchWebsiteContent = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    try {
        const axios = require('axios');
        const cheerio = require('cheerio');
        const response = await axios.get(url, { timeout: 10000 });
        const $ = cheerio.load(response.data);
        $('script, style, nav, footer, header').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        res.json({ text });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch URL: ' + err.message });
    }
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
    deleteQuestion,
    guestWelcome,
    extractFileText,
    fetchWebsiteContent
};