const AIModel = require('../models/aiModel.js');

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

const langCodeToName = (code) => {
    const map = {
        'ta-IN': 'Tamil', 'hi-IN': 'Hindi', 'te-IN': 'Telugu',
        'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'si-LK': 'Sinhala',
        'ar-SA': 'Arabic', 'en-IN': 'English', 'en-US': 'English',
        'en-GB': 'English', 'fr-FR': 'French', 'de-DE': 'German',
        'es-ES': 'Spanish', 'pt-PT': 'Portuguese', 'ja-JP': 'Japanese',
        'zh-CN': 'Chinese', 'ko-KR': 'Korean'
    };
    return map[code] || 'English';
};

const trainAI = (req, res) => {
    const { userId, name, email, mobile, trainingData } = req.body;
    if (!trainingData || trainingData.trim() === '') {
        return res.status(400).json({ message: 'Training data required' });
    }
    AIModel.saveTraining({ userId, name, email, mobile, trainingData }, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save training' });
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
        const masterData = stripHtml(masterRaw);
        const combinedData = basicData + (masterData ? '\n\nAdditional Instructions:\n' + masterData : '');

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: combinedData },
                    { role: 'user', content: message }
                ]
            });
            const reply = aiResponse.choices[0].message.content;
            AIModel.saveChat(userId, message, reply, 'chat', (err2) => { });
            res.status(200).json({ reply });
        } catch (error) {
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
        if (err) return res.status(500).json({ error: 'Failed to register guest' });
        res.json({ guestId: result.insertId, message: 'Registered successfully' });
    });
};

const guestChat = (req, res) => {
    console.log('🔥 NEW CODE RUNNING - replyLang:', req.body.replyLang);
    const { ownerId, guestId, guestName, message, replyLang, whisperLang } = req.body;

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

        // ✅ Language instruction
        let langInstruction = '';
        if (replyLang && replyLang.startsWith('name:')) {
            const langName = replyLang.replace('name:', '');
            langInstruction = `Reply ONLY in ${langName} script and grammar. Keep common English business words in English. NEVER reply in any other language.`;
        } else if (replyLang === 'tanglish') {
            langInstruction = `Reply in Tanglish — Tamil words in English letters. No Tamil script.`;
        } else if (replyLang && replyLang !== 'auto') {
            langInstruction = `Reply in ${langCodeToName(replyLang)} only. Keep common English business words in English.`;
        } else {
            langInstruction = `Reply in the same language the customer uses.`;
        }

        console.log('[Lang] replyLang:', replyLang, '| langInstruction:', langInstruction);

        // ✅ Determine selected language name
        let selectedLangName = '';
        if (replyLang && replyLang.startsWith('name:')) {
    const langName = replyLang.replace('name:', '');
    if (langName.toLowerCase() === 'tamil') {
        langInstruction = `Reply in natural Tamil the way people speak in Chennai — Tamil sentence structure with English words mixed freely and naturally (like: "Budget-friendly options இருக்கு", "Location-wise romba convenient", "site visit book பண்ணலாமா?"). This code-mixing is the NORMAL way — do not force pure Tamil words where English is more natural.`;
    } else {
        langInstruction = `Reply ONLY in ${langName} script and grammar. Keep common English business words in English. NEVER reply in any other language.`;
    }
}

        // ✅ Tamil style block — ONLY when Tamil selected
        let tamilStyleRule = '';
        if (selectedLangName === 'tamil' || replyLang === 'tanglish') {
            tamilStyleRule = '\n\nTAMIL STYLE RULE: When replying in Tamil, use SPOKEN Tamil (பேச்சு வழக்கு) — the way people actually talk in shops and on phone calls. NEVER use formal written Tamil (செந்தமிழ்).'
                + '\nUse spoken forms:'
                + '\n- "இருக்கு" not "இருக்கிறது" or "உள்ளது"'
                + '\n- "நாங்க" not "நாங்கள்", "நீங்க" not "நீங்கள்"'
                + '\n- "எங்ககிட்ட" not "எங்களிடம்"'
                + '\n- "பண்ணலாம்" not "செய்யலாம்", "பண்றோம்" not "செய்கிறோம்"'
                + '\n- "எப்போ" not "எப்போது"'
                + '\n- "வரீங்க" / "வருவீங்க" not "வருகிறீர்கள்"'
                + '\n- "சொல்லுங்க" not "கூறுங்கள்"'
                + '\n- "வேணும்" not "வேண்டும்"'
                + '\nCRITICAL GRAMMAR: The sentence must sound like a real person talking. NEVER combine two verbs awkwardly. NEVER invent words that do not exist in Tamil.'
                + '\nVERB ENDINGS — use the correct form:'
                + '\n- Telling customer to do something (polite command): "-ங்க" → "call பண்ணுங்க", "வாங்க", "சொல்லுங்க", "பாருங்க"'
                + '\n- Asking what customer is doing (question): "-றீங்களா?" → "வர்றீங்களா?", "வேணுமா?"'
                + '\n- NEVER use statement form "-றீங்க" when suggesting an action. Wrong: "call பண்ணுறீங்க" — Right: "call பண்ணுங்க"'
                + '\n- Use real particles only: "எதுவும்" not "ஏனும்". If unsure of a particle, drop it and keep the sentence simple.'
                + '\nWrong: "எப்போது வாங்க வரிகிறீங்க?" — Right: "எப்போ வரீங்க?"'
                + '\nWrong: "நீங்கள் வருகை தரலாம்" — Right: "நீங்க வந்து பாருங்க"'
                + '\nWrong: "உதவிக்குப் பொருத்தமானது பன்னி டேப்" — this is meaningless gibberish. If you cannot form a natural Tamil sentence, use a SIMPLE one instead: "எது வேணும்னு சொல்லுங்க."'
                + '\nWrong: "உதவிக்கரத்தேன்" — this word does not exist. Right: "உதவறேன்" or "help பண்றேன்"'
                + '\nWrong: "jewelry இருக்காங்க" — "இருக்காங்க" is only for people. For products/things use "இருக்குங்க": "jewelry இருக்குங்க"'
                + '\nFor shop timing say "எங்க store/கடை open-ஆ இருக்கும்" not "நாங்க open-ஆ இருக்கோம்".'
                + '\nWrong: "உங்களுக்கு எப்போது வரணும்?" — Right: "எப்போ வரீங்க?"'
                + '\nWhen customer says Thank you / Thanks / நன்றி: reply simply "நன்றிங்க!" — do NOT ask when they are coming.'
                + '\nIf the customer message is unclear, noise, or in an unknown language, politely say: "மன்னிக்கணும், புரியல. இன்னொரு தடவை சொல்லுங்க?" — NEVER be sarcastic or rude.'
                + '\nNEVER sound pushy or demanding. Wrong: "கடைக்கு வாங்க வரணுமா, இல்லையா?" — Right: "Store-க்கு வந்து பாருங்க!"'
                + '\nWhen listing services or products, use ONLY the actual services from the training data above. Format: "நாங்க [service 1], [service 2], [service 3] பண்றோம். உங்களுக்கு எது வேணும்?" — NEVER add services that are not in the training data.'
                + '\nBefore replying, ask yourself: would a shop person in Chennai actually say this sentence out loud? If not, rewrite it simpler.'
                + '\nKeep questions SHORT: "எப்போ வரீங்க?", "என்ன வேணும்?", "photos அனுப்பட்டுமா?"'
                + '\nExample reply style: "ஆமா சார், எங்ககிட்ட [product] இருக்குங்க. இன்னைக்கு Price [rate]. Store-க்கு எப்போ வரீங்க?" — fill with actual details from training data.'
                + '\nAPPOINTMENT RULE: When fixing an appointment, ALWAYS end with a clear confirmation: "சரிங்க, [day] [time]-க்கு appointment fix பண்ணிட்டேன்!" If the requested time is outside working hours, suggest the nearest valid time and ASK: "நாங்க [open time]-க்குதான் திறப்போம்ங்க. [suggested time]-க்கு fix பண்ணட்டுமா?" NEVER leave an appointment request unresolved.'
                + '\nTone: warm, friendly, like a helpful shop person — not like a news reader or textbook.'
                + '\nVOICE TRANSCRIPTION NOTE: The customer is speaking by VOICE, and English words often get written phonetically in Tamil script by the transcriber. ALWAYS try to recognize these as English words before saying you did not understand:'
                + '\n- "பிராடக்ஸ்" / "பராடக்ஸ்" / "ப்ராடக்ட்ஸ்" = Products'
                + '\n- "ப்ரைஸ்" / "பிரைஸ்" = Price, "ரேட்" = Rate'
                + '\n- "ஆஃபர்" / "ஆபர்" = Offer, "டிஸ்கவுண்ட்" = Discount'
                + '\n- "டெலிவரி" = Delivery, "புக்கிங்" = Booking, "அப்பாய்ண்ட்மென்ட்" = Appointment'
                + '\n- "டைமிங்" = Timing, "சர்வீஸ்" / "சர்வீசஸ்" = Service(s)'
                + '\n- "கோல்ட்" = Gold, "சில்வர்" = Silver'
                + '\nGeneral rule: if a Tamil-script word looks strange, sound it out — it is probably an English business word. Answer the question instead of asking to repeat. Only say "புரியல" if the message truly makes no sense even after this.'
                + '\nMOST COMMON MISTAKE — NEVER DO THIS: "இருக்காங்க" is ONLY for PEOPLE ("அவங்க இருக்காங்க"). For products, collections, jewelry, services, things — ALWAYS use "இருக்கு" or polite "இருக்குங்க".'
                + '\nWrong: "bridal collections இருக்காங்க" — Right: "bridal collections இருக்குங்க"'
                + '\nWrong: "Gold ornaments இருக்காங்க" — Right: "Gold ornaments இருக்குங்க"'
                + '\nWrong: "designs இருக்காங்க" — Right: "designs இருக்கு"'
                + '\nCheck EVERY sentence before replying: did you write "இருக்காங்க" about a thing? Change it to "இருக்குங்க".'
                + '\nENDING RULE: NEVER end replies with "வேற எதாவது வேணும்னா சொல்லுங்க" or any repeated closing phrase. Just answer and stop, or end with a SPECIFIC follow-up question related to what they asked (e.g. after timing: "எப்போ வரீங்க?", after products: "எது பிடிச்சிருக்கு?"). Ending every message the same way sounds robotic.';
        }

        // ✅ Generic spoken-style rule for other languages (Telugu, Hindi, Malayalam, Kannada)
        let spokenStyleRule = '';
        if (selectedLangName && selectedLangName !== 'tamil' && selectedLangName !== 'english') {
            const langDisplay = selectedLangName.charAt(0).toUpperCase() + selectedLangName.slice(1);
            spokenStyleRule = '\n\n' + langDisplay.toUpperCase() + ' STYLE RULE: Reply ONLY in spoken, conversational ' + langDisplay + ' — the way people talk in shops and on phone calls, NOT formal written style. Keep common English business words in English. NEVER reply in Tamil or any other language — ONLY ' + langDisplay + '.'
                + '\nIf the customer message is unclear or noise, politely ask them to repeat — in ' + langDisplay + '. NEVER be sarcastic or rude.'
                + '\nWhen fixing an appointment, ALWAYS confirm it clearly. If the requested time is outside working hours, suggest the nearest valid time and ask for confirmation.'
                + '\nTone: warm, friendly, like a helpful shop person.'
                + '\nThe customer is speaking by voice — English words may appear written phonetically in ' + langDisplay + ' script. Sound them out and recognize them as English business words (Products, Price, Offer, Delivery, Timing, etc.) instead of saying you did not understand.';
        }

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

            let conversationHistory = [];
            await new Promise((resolve) => {
                AIModel.getGuestConversationsByGuestId(guestId, (err, history) => {
                    if (!err && history && history.length > 0) {
                        history.slice(-3).forEach(conv => {
                            conversationHistory.push({ role: 'user', content: conv.message });
                            conversationHistory.push({ role: 'assistant', content: conv.reply });
                        });
                    }
                    resolve(true);
                });
            });

            // ✅ Push the REAL customer message with language reminder attached
            let finalUserMessage = message;
            if (selectedLangName) {
                const langDisplay = selectedLangName.charAt(0).toUpperCase() + selectedLangName.slice(1);
                let styleReminder = '';
                if (selectedLangName === 'tamil') {
                   styleReminder = ' Use SPOKEN Tamil only: "நாங்க" never "நாங்கள்", "எங்க" never "எங்களின்", "-ல" never "-இல்" (Chennai-ல not Chennai-இல்), short natural sentences.';
                }
                finalUserMessage = message
                    + '\n\n[Reply ONLY in ' + langDisplay + ' — even if previous replies above are in a different language, ignore them and reply in ' + langDisplay + '.'
                    + styleReminder
                    + ' Say times in natural spoken form, NEVER 24-hour format like "09:00-19:00". Do NOT copy your previous replies word-for-word.]';
            }
            conversationHistory.push({ role: 'user', content: finalUserMessage });

            // ✅ Parse training data rules dynamically
            const getVal = (key) => {
                const m = basicData.match(new RegExp(key + '[^:\n]*:\\s*([^\n]+)', 'i'));
                return m ? m[1].trim() : '';
            };

            const addressStyle = getVal('How should the AI address customers');
            const canRepeatName = getVal('Can AI call customer by name repeatedly');
            const canOffTopic = getVal('Can AI speak about topics not related to business');
            const replyLength = getVal('How should AI reply');
            const commStyle = getVal('Communication Style');
            const closingStyle = getVal('End Conversation Style');

            const addr = addressStyle.toLowerCase();
            const nameRule = addr.includes('friend')
                ? `Address the customer as a close friend. NEVER use their name "${guestName}". Talk casually.`
                : addr.includes('boss')
                    ? `Address the customer as "Boss" respectfully.`
                    : addr.includes('thalaivare')
                        ? `Address the customer as "Thalaivare" respectfully.`
                        : addr.includes('dear customer')
                            ? `Address the customer as "Dear Customer".`
                            : addr.includes('by customer name') || canRepeatName.toLowerCase() === 'yes'
                                ? `Address the customer by name "${guestName}" naturally — not in every message.`
                                : `Address the customer naturally without repeating their name.`;

            // ✅ Off-topic rule — Yes means brief acknowledgment only, then redirect
            const offTopicRule = canOffTopic.toLowerCase() === 'yes'
                ? `For off-topic questions (books, movies, general topics): give ONLY a very brief 5-10 word acknowledgment, then IMMEDIATELY redirect to business. NEVER give recommendations, reviews, or detailed answers about non-business topics.`
                : `ONLY answer business-related questions. Redirect off-topic questions to business immediately.`;

            const lengthRule = replyLength.toLowerCase().includes('short') || replyLength.toLowerCase().includes('very short')
                ? `Keep replies very short — 1-2 sentences maximum.`
                : replyLength.toLowerCase().includes('medium')
                    ? `Keep replies concise — 2-3 sentences.`
                    : `Replies can be detailed when needed.`;

            const aiNameMatch2 = basicData.match(/AI Employee Name:\s*(.+)/i);
            const aiName2 = aiNameMatch2 ? aiNameMatch2[1].trim() : 'AI Assistant';
            const bizNameMatch2 = basicData.match(/Business Name:\s*(.+)/i);
            const bizName2 = bizNameMatch2 ? bizNameMatch2[1].trim() : 'this business';

            const systemPrompt = 'Your name is ' + aiName2 + '. You are an AI Employee for ' + bizName2 + '.\n\n'
                + combinedData
                + '\n\n---'
                + '\nCustomer name: ' + (guestName || 'the customer')
                + '\n' + nameRule
                + '\n' + offTopicRule
                + '\n' + lengthRule
                + '\n\n### LANGUAGE RULE — CANNOT BE OVERRIDDEN ###\n' + langInstruction
                + '\nThis rule applies to EVERY single reply. No exceptions. Not even one word in another language.'
                + '\nEven if previous messages were in Tamil or any other language, YOU MUST reply in the selected language NOW.'
                + '\nVoice output: short natural sentences, no bullet points, no markdown, no numbered lists.'
                + '\n\nENGLISH WORD MIXING RULE: When replying in Tamil, Hindi, Telugu, Malayalam, Kannada or any Indian language, keep common English words in English — the way educated Indians naturally speak. NEVER translate these into the local language:'
                + '\n- Product/service names: Gold, Silver, Diamond, Platinum, and product names from training data'
                + '\n- Business terms: Price, Rate, Offer, Discount, Booking, Order, Payment, EMI, GST, Bill, Invoice, Stock'
                + '\n- Logistics: Delivery, Transport, Courier, Pickup, Shipping, Tracking'
                + '\n- Common terms: Online, Offline, WhatsApp, Mobile, Website, Email, Location, Branch, Store, Shop, Appointment, Timing, Free, Warranty, Guarantee, Brand, Quality, Service'
                + '\n- Units and numbers: kg, gram, litre, km, %, Rs., percentages, phone numbers'
                + tamilStyleRule
                + spokenStyleRule
                + '\n\nANSWER RULES:'
                + '\nIf the customer asks "கேக்குதா?", "நான் பேசுறது கேக்குதா?", "hello hello", or tests whether you can hear them: reply "ஆமா, நல்லா கேக்குது! சொல்லுங்க." — this is a mic test, not an unclear message.'
                + '\nNEVER say "புரியல" or ask to repeat when the question is CLEAR. "புரியல" is ONLY for garbled/noise messages. If the question is clear but the training data has no answer, say so honestly and offer to connect them: "அது பத்தி full details எங்ககிட்ட இல்லங்க. நம்ம team-கிட்ட கேட்டு சொல்றேன் — உங்க number-க்கு call பண்ணட்டுமா?"'
                + '\nIf a service is listed in training data but has no description, describe it briefly from the name and offer details: "Digital services-ல websites, marketing மாதிரி வேலைகள் பண்றோம். Detail-ஆ தெரியணும்னா சொல்லுங்க."'
                + '\nAlways answer the ACTUAL question directly — no beating around the bush.'
                + '\nNEVER greet again after the first message — jump straight to answering the question.'
                + '\nFor EVERY question — give a SPECIFIC answer from training data. Do not give the same generic reply repeatedly.'
                + '\nINCOMPLETE SENTENCE RULE: If the customer message looks cut off or incomplete (e.g. just "உங்க", "நான் ஒரு", "where are") and does NOT make sense as a complete thought in this conversation context, reply: "நீங்க எதோ சொல்ல நினைக்கிறீங்க, ஆனா முழுசா சொல்லலைன்னு நினைக்கிறேன். Please முழு sentence-ஆ சொல்லுங்க." (in the selected language). But if the short message DOES make sense in context (e.g. "ஆமா", "10 மணிக்கு", "gold"), answer it normally.'
                + '\nTIME FORMAT RULE: NEVER say times in 24-hour format like "19:00" or "09:00-19:00". Always convert to natural spoken form in the selected language. Example Tamil: "காலை 9 மணி முதல் மாலை 7 மணி வரை open-ஆ இருக்கும்". Example English: "9 AM to 7 PM".';



           let aiResponse;
            try {
                aiResponse = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    temperature: 0.4,
                    max_tokens: 150,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory
                    ]
                });
            } catch (retryErr) {
                // ✅ One automatic retry after 1 second — survives random API hiccups
                console.log('[Retry] OpenAI failed once, retrying:', retryErr.message);
                await new Promise(r => setTimeout(r, 1000));
                aiResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    temperature: 0.4,
                    max_tokens: 150,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory
                    ]
                });
            }

            const reply = aiResponse.choices[0].message.content;
            AIModel.saveGuestChat(ownerId, guestId, guestName, message, reply, (err2) => { });
            res.status(200).json({ reply });

            generateClientSummary(openai, guestId, conversationHistory, message, reply);

        } catch (error) {
            console.error('❌ guestChat error:', error.message);
            res.status(500).json({ error: 'AI response failed', details: error.message });
        }
    });
};

async function generateClientSummary(openai, guestId, conversationHistory, latestMessage, latestReply) {
    try {
        const transcriptParts = [];
        conversationHistory.forEach(m => {
            transcriptParts.push(`${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content}`);
        });
        transcriptParts.push(`AI: ${latestReply}`);
        const transcript = transcriptParts.slice(-12).join('\n');

        const summaryResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Analyze this customer conversation. Respond in EXACTLY this format:
SCORE: <1-10>
SUMMARY:
<line 1: what customer is interested in, under 12 words>
<line 2: key details or "No specific details shared yet", under 12 words>
<line 3: current status / next step, under 12 words>
Score: 9-10=ready to buy, 6-8=interested, 3-5=browsing, 1-2=uninterested. No extra text.`
                },
                { role: 'user', content: transcript }
            ]
        });

        const raw = summaryResponse.choices[0].message.content.trim();
        let score = 1;
        const scoreMatch = raw.match(/SCORE:\s*(\d+)/i);
        if (scoreMatch) score = Math.max(1, Math.min(10, parseInt(scoreMatch[1], 10)));
        let summary = '';
        const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*)/i);
        if (summaryMatch) summary = summaryMatch[1].trim();
        else summary = raw;

        AIModel.updateGuestSummary(guestId, summary, (err) => { });
        AIModel.updateGuestScore(guestId, score, (err) => { });
    } catch (err) { }
}

const checkOwner = (req, res) => {
    const ownerId = req.params.ownerId;
    AIModel.getTrainingData(ownerId, (err, results) => {
        if (err) return res.status(500).json({ valid: false });
        if (results.length > 0 && results[0].training_data) return res.status(200).json({ valid: true });
        else return res.status(200).json({ valid: false });
    });
};

const checkGuest = (req, res) => {
    const { email, mobile, ownerId } = req.body;
    AIModel.findGuest(email, mobile, ownerId, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error checking guest' });
        if (results.length > 0) return res.json({ exists: true, guestId: results[0].id, name: results[0].name });
        else return res.json({ exists: false });
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
    const { ownerId, selectedLanguage } = req.body;
    AIModel.getTrainingData(ownerId, async (err, results) => {
        if (err || results.length === 0) return res.json({ suggestions: [] });

        const basicData = results[0].training_data || '';
        const masterRaw = results[0].master_data || '';
        const masterData = stripHtml(masterRaw);
        const combinedData = basicData + (masterData ? '\n\nAdditional Info:\n' + masterData : '');

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
            };
            preferredLang = langMap[langName] || 'en';
        }

        try {
            const OpenAI = require('openai');
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Based on this business training data, generate exactly 6 short common questions a customer might ask in English. Return ONLY a JSON array of strings. No explanation, no extra text.\nExample: ["What services do you offer?", "What is your pricing?"]\n\nTraining data:\n${combinedData}`
                    },
                    { role: 'user', content: 'Generate 6 customer questions.' }
                ]
            });

            const content = aiResponse.choices[0].message.content;
            const suggestions = JSON.parse(content);

            const langToTranslate = selectedLanguage ? selectedLanguage.toLowerCase() : null;
            const langCodeMap = { 'tamil': 'ta', 'hindi': 'hi', 'telugu': 'te', 'malayalam': 'ml', 'kannada': 'kn', 'english': 'en' };
            const targetLang = langToTranslate ? (langCodeMap[langToTranslate] || preferredLang) : preferredLang;

            if (targetLang === 'en') return res.json({ suggestions });

            const axiosLib = require('axios');
            const apiKey = process.env.GOOGLE_TRANSLATE_KEY;
            const translateRes = await axiosLib.post(
                `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
                { q: suggestions, source: 'en', target: targetLang, format: 'text' }
            );
            const translated = translateRes.data.data.translations.map((t) => t.translatedText);
            res.json({ suggestions: translated });
        } catch (error) {
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
        const hotSql = `SELECT COUNT(*) as hot FROM (SELECT guest_id, COUNT(*) as cnt FROM guest_conversations WHERE owner_id = ? GROUP BY guest_id HAVING cnt >= 3) t`;
        const coldSql = `SELECT COUNT(*) as cold FROM (SELECT guest_id, COUNT(*) as cnt FROM guest_conversations WHERE owner_id = ? GROUP BY guest_id HAVING cnt < 3) t`;
        const db = require('../config/db');
        db.query(hotSql, [userId], (err2, hotRes) => {
            if (err2) return res.status(500).json({ error: 'Failed' });
            db.query(coldSql, [userId], (err3, coldRes) => {
                if (err3) return res.status(500).json({ error: 'Failed' });
                res.json({
                    totalConversations: total, totalClients: clients,
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
                if (!q.options) options = [];
                else if (Array.isArray(q.options)) options = q.options;
                else if (typeof q.options === 'string') options = JSON.parse(q.options);
                else options = [];
            } catch (e) { options = []; }
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
    const { ownerId, guestName, returning, selectedLanguage } = req.body;
    AIModel.getTrainingData(ownerId, async (err, results) => {
        if (err || results.length === 0) return res.status(500).json({ error: 'Training data not found' });

        const basicData = results[0].training_data || '';

        let aiName = 'AI Assistant';
        const aiNameMatch = basicData.match(/AI Employee Name:\s*(.+)/i);
        if (aiNameMatch) aiName = aiNameMatch[1].trim();

        let businessName = 'our company';
        const bizNameMatch = basicData.match(/Business Name:\s*(.+)/i);
        if (bizNameMatch) businessName = bizNameMatch[1].trim();

        let introScript = `Hi! I am ${aiName} from ${businessName}. How can I help you today?`;
        const introMatch = basicData.match(/AI Introduction Script:\s*(.+)/i);
        if (introMatch) {
            introScript = introMatch[1].trim()
                .replace(/{AI Name}/gi, aiName)
                .replace(/{Company Name}/gi, businessName)
                .replace(/{Customer Name}/gi, guestName);
        }

        // ✅ Check addressing style — Friend = never use name
        const addrMatch = basicData.match(/How should the AI address customers[^:\n]*:\s*([^\n]+)/i);
        const addrStyle = addrMatch ? addrMatch[1].trim().toLowerCase() : '';
        const useName = !addrStyle.includes('friend');

        const rawMessage = returning ? introScript : introScript;

        if (!selectedLanguage || selectedLanguage === 'English') {
            return res.json({ reply: rawMessage });
        }

        // try {
        //     const OpenAI = require('openai');
        //     const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        //     const translated = await openai.chat.completions.create({
        //         model: 'gpt-4o-mini',
        //         messages: [
        //             {
        //                 role: 'system',
        //                 content: `Translate to ${selectedLanguage}. Output ONLY ${selectedLanguage} text. No mixing. Keep "${aiName}" and "${businessName}" as-is.`
        //             },
        //             { role: 'user', content: rawMessage }
        //         ]
        //     });
        //     return res.json({ reply: translated.choices[0].message.content.trim() });
        // } catch (e) {
        //     return res.json({ reply: rawMessage });
        // }

       try {
            const axiosLib = require('axios');
            const langCodeMap = {
                'Tamil': 'ta', 'Hindi': 'hi', 'Telugu': 'te',
                'Malayalam': 'ml', 'Kannada': 'kn', 'English': 'en'
            };
            const targetLang = langCodeMap[selectedLanguage] || 'ta';
            const apiKey = process.env.GOOGLE_TRANSLATE_KEY;

            // ✅ Protect names from translation using placeholders
            const templateMsg = rawMessage
                .split(aiName).join('###AINAME###')
                .split(businessName).join('###BIZNAME###');

            const translateRes = await axiosLib.post(
                `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
                { q: templateMsg, source: 'en', target: targetLang, format: 'text' }
            );
            let translated = translateRes.data.data.translations[0].translatedText;

            // ✅ Put the real names back in English
            translated = translated
                .replace(/###\s*AINAME\s*###/gi, aiName)
                .replace(/###\s*BIZNAME\s*###/gi, businessName);

            return res.json({ reply: translated });
        } catch (e) {
            return res.json({ reply: rawMessage });
        }
    });
};

const extractFileText = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileName = req.file.originalname.toLowerCase();
        const buffer = req.file.buffer;
        let extractedText = '';
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const XLSX = require('xlsx');
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                extractedText += `--- Sheet: ${sheetName} ---\n${XLSX.utils.sheet_to_csv(sheet)}\n\n`;
            });
        } else if (fileName.endsWith('.csv')) {
            extractedText = buffer.toString('utf8');
        } else if (fileName.endsWith('.pdf')) {
            try { const pdfParse = require('pdf-parse'); const data = await pdfParse(buffer); extractedText = data.text; }
            catch (pdfErr) { extractedText = '[PDF extraction failed: ' + pdfErr.message + ']'; }
        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            try { const mammoth = require('mammoth'); const result = await mammoth.extractRawText({ buffer }); extractedText = result.value; }
            catch (docErr) { extractedText = '[DOCX extraction failed: ' + docErr.message + ']'; }
        } else if (fileName.endsWith('.txt')) {
            extractedText = buffer.toString('utf8');
        } else {
            extractedText = '[Unsupported file type: ' + fileName + ']';
        }
        if (!extractedText.trim()) extractedText = '[No text content found in file]';
        res.json({ text: extractedText });
    } catch (error) {
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

// ✅ Build dynamic Whisper vocabulary hint from owner's training data
const buildWhisperPrompt = (basicData) => {
    const words = new Set([
        'Price', 'Rate', 'Offer', 'Discount', 'Delivery', 'Booking',
        'Appointment', 'Timing', 'WhatsApp', 'EMI', 'GST', 'Products', 'Services'
    ]);
    if (basicData) {
        // Product/Service names from training data
        const productMatches = basicData.match(/Product or Service \d+:\s*(.+)/gi) || [];
        productMatches.forEach(m => {
            const val = m.split(':')[1]?.trim();
            if (val) val.split(/[,\/]/).forEach(w => { if (w.trim()) words.add(w.trim()); });
        });
        // Business name
        const bizMatch = basicData.match(/Business Name:\s*(.+)/i);
        if (bizMatch) words.add(bizMatch[1].trim());
        // Business category
        const catMatch = basicData.match(/Business Category:\s*(.+)/i);
        if (catMatch) words.add(catMatch[1].trim());
    }
   return Array.from(words).slice(0, 25).join(', ').substring(0, 400);
};

const whisperTranscribe = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });

    // ✅ Get ownerId from request (sent by frontend)
    const ownerId = req.body.ownerId;

    // ✅ Fetch owner's training data for vocabulary hint
    let whisperPrompt = buildWhisperPrompt('');
    if (ownerId) {
        try {
            const trainingResults = await new Promise((resolve) => {
                AIModel.getTrainingData(ownerId, (err, results) => {
                    resolve(err || !results || results.length === 0 ? null : results);
                });
            });
            if (trainingResults) {
                whisperPrompt = buildWhisperPrompt(trainingResults[0].training_data || '');
            }
        } catch (e) { /* fall back to default vocab */ }
    }

    try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const tempPath = path.join(os.tmpdir(), `whisper_${Date.now()}.webm`);
        fs.writeFileSync(tempPath, req.file.buffer);
        const langHint = req.body.selectedLanguage ?
            { 'tamil': 'ta', 'hindi': 'hi', 'telugu': 'te', 'malayalam': 'ml', 'kannada': 'kn', 'english': 'en' }[req.body.selectedLanguage.toLowerCase()]
            : undefined;

       let transcription;
        try {
            // ✅ gpt-4o-transcribe: much better Tamil/Indian language accuracy than whisper-1
            transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempPath),
                model: 'gpt-4o-transcribe',
                response_format: 'json',
                prompt: whisperPrompt,
                ...(langHint && { language: langHint })
            });
        } catch (langErr) {
            // ✅ Fallback to whisper-1 if gpt-4o-transcribe fails for any reason
            console.log('[Whisper] gpt-4o-transcribe failed, falling back to whisper-1:', langErr.message);
            transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempPath),
                model: 'whisper-1',
                response_format: 'verbose_json',
                prompt: whisperPrompt
            });
        }
        try { fs.unlinkSync(tempPath); } catch (e) { }
        const rawLang = transcription.language;
        let rawText = transcription.text?.trim() || '';

        // ✅ Reject noise hallucinations (relaxed thresholds)
        if (transcription.segments && transcription.segments.length > 0) {
            const avgNoSpeech = transcription.segments.reduce((s, seg) => s + (seg.no_speech_prob || 0), 0) / transcription.segments.length;
            const avgLogProb = transcription.segments.reduce((s, seg) => s + (seg.avg_logprob || 0), 0) / transcription.segments.length;
            if (avgNoSpeech > 0.85 && avgLogProb < -1.2) {
                console.log('[Whisper] Rejected noise:', rawText, '| no_speech:', avgNoSpeech.toFixed(2), '| logprob:', avgLogProb.toFixed(2));
                rawText = '';
            }
        }

        console.log('[Whisper] Detected lang:', rawLang, '| Text:', rawText);
        console.log('[Whisper] Detected lang:', rawLang, '| Text:', rawText, '| Vocab:', whisperPrompt.substring(0, 80));
        res.json({ text: rawText, language: rawLang });
    } catch (error) {
        console.error('[Whisper] Error:', error.message);
        res.status(500).json({ error: 'Whisper failed', details: error.message });
    }
};

const textToSpeech = async (req, res) => {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    try {
        const axios = require('axios');

        // ✅ Clean markdown symbols so TTS sounds natural
        const cleanText = text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/#{1,6}\s/g, '')
            .replace(/•\s/g, ', ')
            .replace(/\n+/g, '. ')
            .replace(/\s{2,}/g, ' ')
            .trim();

        // ✅ ElevenLabs voice ID — "Rachel" is natural warm female voice
        // Other options: 
        // Rachel: 21m00Tcm4TlvDq8ikWAM (warm, natural)
        // Bella: EXAVITQu4vr4xnSDxMaL (soft, friendly)
        // Elli: MF3mGyEYCl7XYWbV9V6O (young, energetic)
        // ✅ Select voice based on language
        // ✅ Use language-specific voices
         const voiceMap = {
            'tamil': 'XrExE9yKIg1WjnnlVkGX',      // Matilda — warm, gentle
            'hindi': 'XrExE9yKIg1WjnnlVkGX',
            'telugu': 'XrExE9yKIg1WjnnlVkGX',
            'malayalam': 'XrExE9yKIg1WjnnlVkGX',
            'kannada': 'XrExE9yKIg1WjnnlVkGX',
            'english': '21m00Tcm4TlvDq8ikWAM',    // Rachel
        };
        const voiceId = voiceMap[language?.toLowerCase()] || '21m00Tcm4TlvDq8ikWAM';

        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3`,
            {
                text: cleanText,
                model_id: 'eleven_flash_v2_5',
                voice_settings: {
                    stability: 0.75,          // higher = calmer, steadier (was 0.5)
                    similarity_boost: 0.65,
                    style: 0.25,              // slight warmth
                    use_speaker_boost: true
                }
            },
            {
                headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                responseType: 'arraybuffer'
            }
        );

        const base64Audio = Buffer.from(response.data).toString('base64');
        console.log('[TTS] ElevenLabs generated, size:', base64Audio.length, 'language:', language);
        res.json({ audioContent: base64Audio });

    } catch (error) {
        console.error('[TTS] ElevenLabs Error:', error.message);
        console.error('[TTS] Response data:', error.response?.data?.toString());
        console.error('[TTS] API Key (first 10):', process.env.ELEVENLABS_API_KEY?.substring(0, 10));
        res.status(500).json({ error: 'TTS failed', details: error.message });
    }
};

module.exports = {
    trainAI, saveMasterAI, getTraining, chatWithAI, updateLang, getLang,
    getConversations, registerGuest, guestChat, checkOwner, checkGuest,
    getGuestConversationsByGuestId, getAISuggestions, getDashboardStats,
    getClients, getQuestions, saveQuestion, updateQuestion, deleteQuestion,
    guestWelcome, extractFileText, fetchWebsiteContent, whisperTranscribe, textToSpeech
};