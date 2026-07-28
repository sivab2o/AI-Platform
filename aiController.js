const AIModel = require('../models/aiModel.js');
const nodemailer = require('nodemailer');
const trainingCache = new Map();

const getBusinessMailTransporter = (userId) => {
    return new Promise((resolve, reject) => {

        AIModel.getBusinessEmailSettings(
            userId,
            (error, rows) => {

                if (error) {
                    return reject(error);
                }

                if (!rows || rows.length === 0) {
                    return reject(
                        new Error(
                            'Business Gmail is not configured for this user'
                        )
                    );
                }

                const emailSettings = rows[0];

                if (
                    !emailSettings.business_email ||
                    !emailSettings.app_password
                ) {
                    return reject(
                        new Error(
                            'Business Gmail or App Password is missing'
                        )
                    );
                }

                console.log("VERIFY API STARTED");

                console.log("EMAIL RECEIVED:", businessEmail);
                console.log("PASSWORD RECEIVED LENGTH:", cleanPassword.length);

                const transporter =
                    nodemailer.createTransport({

                        service: 'gmail',

                        secure: true,

                        auth: {
                            user: emailSettings.business_email,

                            pass: String(
                                emailSettings.app_password || ''
                            ).replace(/\s+/g, '')
                        },

                        tls: {
                            rejectUnauthorized: false
                        }

                    });

                resolve({
                    transporter,
                    businessEmail:
                        emailSettings.business_email
                });


            }
        );
    });
};

const testBusinessEmailConnection = async (req, res) => {

    const { businessEmail, businessAppPassword } = req.body;

    if (!businessEmail || !businessAppPassword) {
        return res.status(400).json({
            success: false,
            message: 'Gmail and App Password required'
        });
    }

    const cleanPassword = String(businessAppPassword)
        .replace(/\s+/g, '')
        .trim();


    if (cleanPassword.length !== 16) {
        return res.status(400).json({
            success: false,
            message: 'Google App Password must contain 16 characters'
        });
    }


    try {

        console.log("VERIFY API STARTED");

        console.log("EMAIL RECEIVED:", businessEmail);
        console.log("PASSWORD RECEIVED LENGTH:", cleanPassword.length);

        const transporter = nodemailer.createTransport({


            service: 'gmail',

            auth: {
                user: businessEmail.trim(),
                pass: cleanPassword
            }

        });


        await transporter.verify();


        res.json({
            success: true,
            message: 'Gmail connection successful'
        });


    } catch (error) {

        console.log("Gmail Verify Error:", error.message);

        res.status(400).json({

            success: false,

            message:
                'Invalid Gmail or App Password. Please check Google App Password.'

        });

    }

};

const sendInfoEmail = async ({
    userId,
    toEmail,
    basicData,
    masterData,
    topic = 'all',
    intent = 'details',
    conversationText = ''
}) => {

    const get = (label) => {
        const match = basicData.match(
            new RegExp(label + ':\\s*(.+)', 'i')
        );

        return match ? match[1].trim() : '';
    };

    const bizName = get('Business Name') || 'Our Business';
    const bizDescription = get('Business Description');
    const whatsapp = get('Business WhatsApp Number');
    const contactBusinessEmail = get('Business Email');
    const website = get('Website / Social Media URL');
    const location = get('Business Location / Service Area');

    const cleanMasterData = (masterData || '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const OpenAI = require('openai');

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    const emailContentResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 500,
        messages: [
            {
                role: 'system',
                content: `
You prepare short customer information emails using only the supplied business data and conversation.

STRICT RULES:

1. Include ONLY the information requested by the customer.
2. Do not include unrelated products, services, FAQs or company information.
3. The selected topic is: ${topic}
4. The requested information type is: ${intent}

INTENT RULES:

- pricing:
  Include only pricing, starting price, price range, package cost, quotation-related information and necessary price conditions.
  Do not include general FAQs or unrelated service descriptions.

- portfolio:
  Include only previous work, project samples, website links or portfolio information.

- brochure:
  Include a concise overview only for the selected topic.

- features:
  Include only features and benefits for the selected topic.

- contact:
  Include only relevant contact information.

- details:
  Include only information directly related to the selected topic.

- all:
  Include complete information only when the customer explicitly requested everything.

5. Never invent prices, features, offers, links or promises.
6. If an exact detail is unavailable, clearly state that the final amount depends on the customer's requirements.
7. Do not mention that you are an AI.
8. Return clean HTML only.
9. Do not include an email subject.
10. Do not include greetings, signatures or contact details because they will be added separately.
`
            },
            {
                role: 'user',
                content: `
CUSTOMER'S RECENT CONVERSATION:

${conversationText}

REQUESTED TOPIC:

${topic}

REQUESTED INFORMATION TYPE:

${intent}

BUSINESS BASIC DATA:

${basicData}

BUSINESS MASTER DATA:

${cleanMasterData}

Create only the requested email content.
`
            }
        ]
    });

    let requestedContent =
        emailContentResponse.choices?.[0]?.message?.content?.trim() || '';

    requestedContent = requestedContent
        .replace(/^```html/i, '')
        .replace(/^```/i, '')
        .replace(/```$/i, '')
        .trim();

    if (!requestedContent) {
        requestedContent = `
            <p>
                Thank you for your interest in ${topic}.
                Please contact our team for the exact information.
            </p>
        `;
    }

    const subjectIntentMap = {
        pricing: 'Price Details',
        portfolio: 'Portfolio Details',
        brochure: 'Brochure',
        features: 'Features and Benefits',
        contact: 'Contact Details',
        details: 'Information',
        all: 'Complete Information'
    };

    const subjectType =
        subjectIntentMap[intent.toLowerCase()] || 'Information';

    const html = `
        <div style="
            font-family: Arial, sans-serif;
            max-width: 650px;
            margin: 0 auto;
            color: #333;
            line-height: 1.6;
        ">
            <div style="
                background: #4a148c;
                color: #ffffff;
                padding: 24px;
                border-radius: 8px 8px 0 0;
            ">
                <h2 style="margin: 0;">${bizName}</h2>
            </div>

            <div style="
                padding: 24px;
                border: 1px solid #eeeeee;
                border-top: none;
                border-radius: 0 0 8px 8px;
            ">
                <p>Dear Customer,</p>

                <p>
                    Thank you for your interest. Here are the
                    ${subjectType.toLowerCase()} you requested for
                    <strong>${topic}</strong>.
                </p>

                ${requestedContent}

                <hr style="
                    border: none;
                    border-top: 1px solid #eeeeee;
                    margin: 24px 0;
                ">

                <p>
                    <strong>Contact Us</strong><br>

                    ${whatsapp
            ? `📱 WhatsApp: ${whatsapp}<br>`
            : ''
        }

            ${contactBusinessEmail
            ? `📧 Email: ${contactBusinessEmail}<br>`
            : ''
        }
        }

                    ${website
            ? `🌐 Website:
                           <a href="${website}">${website}</a><br>`
            : ''
        }

                    ${location
            ? `📍 ${location}`
            : ''
        }
                </p>
            </div>
        </div>
    `;

    const {
        transporter,
        businessEmail: senderBusinessEmail
    } = await getBusinessMailTransporter(userId);

    return transporter.sendMail({
        from: `"${bizName}" <${senderBusinessEmail}>`,
        replyTo: senderBusinessEmail,
        to: toEmail,
        subject: `${bizName} — ${topic} ${subjectType}`,
        html
    });
};

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

const trainAI = async (req, res) => {
    const { userId, name, email, mobile, trainingData, businessEmail, businessAppPassword } = req.body;
    if (!trainingData || trainingData.trim() === '') {
        return res.status(400).json({ message: 'Training data required' });
    }
    AIModel.saveTraining(
        {
            userId,
            name,
            email,
            mobile,
            trainingData
        },
        async (trainingError, trainingResult) => {

            if (trainingError) {
                console.error(
                    'Training save error:',
                    trainingError
                );

                return res.status(500).json({
                    success: false,
                    message: 'Training failed'
                });
            }

            // Business Gmail is optional.
            if (
                businessEmail &&
                businessAppPassword
            ) {

                const cleanAppPassword = String(
                    businessAppPassword
                )
                    .replace(/\s+/g, '')
                    .trim();


                if (cleanAppPassword.length !== 16) {

                    return res.status(400).json({

                        success: false,

                        message:
                            'Google App Password must contain 16 characters'

                    });

                }


                // ✅ VERIFY GMAIL BEFORE SAVING

                try {

                    const verifyTransporter =
                        nodemailer.createTransport({

                            service: 'gmail',

                            auth: {
                                user: businessEmail,
                                pass: cleanAppPassword
                            }

                        });


                    await verifyTransporter.verify();


                } catch (error) {


                    return res.status(400).json({

                        success: false,

                        message:
                            'Invalid Gmail or App Password. Please check Google App Password.'

                    });


                }



                AIModel.saveBusinessEmailSettings(
                    {
                        userId,
                        businessEmail,
                        businessAppPassword:
                            cleanAppPassword
                    },
                    (
                        emailSettingsError,
                        emailSettingsResult
                    ) => {

                        if (emailSettingsError) {
                            console.error(
                                'Business email settings save error:',
                                emailSettingsError
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    'AI training saved, but business email settings could not be saved'
                            });
                        }

                        return res.status(200).json({

                            success: true,

                            message:
                                'AI training and business email settings saved successfully'

                        });
                    }
                );

                return;
            }

            return res.status(200).json({
                success: true,
                message:
                    'AI training saved successfully'
            });
        }
    );
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

const guestChat = async (req, res) => {
    console.log("🚀 GUEST CHAT START");
    const { ownerId, guestId, guestName, message, replyLang, whisperLang } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ message: 'Message required' });
    }

    const loadTrainingData = async () => {

        if (trainingCache.has(ownerId)) {

            return trainingCache.get(ownerId);

        }


        const data = await new Promise((resolve, reject) => {

            AIModel.getTrainingData(ownerId, (err, results) => {

                if (err) {
                    reject(err);
                    return;
                }

                resolve(results);

            });

        });


        trainingCache.set(ownerId, data);


        return data;

    };



    let results;

    try {

        results = await loadTrainingData();

    }
    catch (err) {

        return res.status(500).json({
            error: 'Error fetching training data'
        });

    }


    if (!results || results.length === 0) {

        return res.status(400).json({
            message: 'AI not trained yet'
        });

    }

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
        selectedLangName = langName.toLowerCase();
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
            + '\nWrong: "quality-க்கு கம்பளி" — கம்பளி means blanket! For assurance say: "quality guarantee-ங்க" or "கவலையே வேண்டாம், BIS Hallmark இருக்கு."'
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

        // ✅ If selected language differs from history language, drop history (prevents old-language override)
        if (selectedLangName && conversationHistory.length > 0) {
            const scriptRanges = {
                'tamil': /[\u0B80-\u0BFF]/, 'telugu': /[\u0C00-\u0C7F]/,
                'hindi': /[\u0900-\u097F]/, 'malayalam': /[\u0D00-\u0D7F]/,
                'kannada': /[\u0C80-\u0CFF]/
            };
            const selectedScript = scriptRanges[selectedLangName];
            const lastReply = conversationHistory[conversationHistory.length - 1].content || '';
            const otherScripts = Object.entries(scriptRanges).filter(([lang]) => lang !== selectedLangName);
            const historyInOtherLang = otherScripts.some(([lang, regex]) => regex.test(lastReply));
            const historyInSelectedLang = selectedScript ? selectedScript.test(lastReply) : false;
            if (historyInOtherLang && !historyInSelectedLang) {
                console.log('[Lang] History language mismatch — clearing history for clean', selectedLangName, 'session');
                conversationHistory = [];
            }
        }

        // ✅ Detect exact-duplicate customer message — tell GPT explicitly
        let duplicateNote = '';
        const prevUserMsgs = conversationHistory.filter(m => m.role === 'user').map(m => m.content.trim().toLowerCase());
        if (prevUserMsgs.some(p => p.startsWith(message.trim().toLowerCase()))) {
            duplicateNote = '\n\n[NOTE: The customer already sent this same message before and you handled it. Do NOT repeat your previous reply word-for-word. Acknowledge it is already done, in DIFFERENT short words.]';
        }

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
        finalUserMessage = finalUserMessage + duplicateNote;   // ✅ NEW LINE — add this

        console.log('[Debug] finalUserMessage:', finalUserMessage.substring(0, 200));

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
        // const offTopicRule = canOffTopic.toLowerCase() === 'yes'
        //     ? `For off-topic questions (books, movies, general topics): give ONLY a very brief 5-10 word acknowledgment, then IMMEDIATELY redirect to business. NEVER give recommendations, reviews, or detailed answers about non-business topics.`
        //     : `ONLY answer business-related questions. Redirect off-topic questions to business immediately.`;

        const offTopicRule = canOffTopic.toLowerCase() === 'yes'
            ? `
                The AI is allowed to answer topics that are not related to the business.

                When the customer asks a general or off-topic question:

                - Answer the customer's actual question directly.
                - Give a polished, natural, accurate and helpful response.
                - Sound friendly and professional.
                - Do not force the conversation back to the business.
                - Do not say that you can only discuss business.
                - Avoid repeating the same wording or response.
                - Keep the response according to the selected reply length.
                `
            : `
                The AI is not allowed to answer topics unrelated to the business.

                When the customer asks an off-topic question:

                - Do not provide the actual answer to the off-topic question.
                - Politely explain that you can assist only with questions related to this business.
                - Gently guide the customer towards the business products or services.
                - Keep the response polished, friendly and professional.
                - Do not sound rude, robotic or repetitive.
                - Use different natural wording when similar questions are asked again.
                `;

        const lengthRule = replyLength.toLowerCase().includes('short') || replyLength.toLowerCase().includes('very short')
            ? `Keep replies very short — 1-2 sentences maximum.`
            : replyLength.toLowerCase().includes('medium')
                ? `Keep replies concise — 2-3 sentences.`
                : `Replies can be detailed when needed.`;

        const aiNameMatch2 = basicData.match(/AI Employee Name:\s*(.+)/i);
        const aiName2 = aiNameMatch2 ? aiNameMatch2[1].trim() : 'AI Assistant';
        const bizNameMatch2 = basicData.match(/Business Name:\s*(.+)/i);
        const bizName2 = bizNameMatch2 ? bizNameMatch2[1].trim() : 'this business';

        const systemPrompt = '## ROLE\n'
            + 'You are ' + aiName2 + ', a highly experienced Sales Consultant for ' + bizName2 + ' with 25+ years of experience in sales, customer psychology, objection handling and closing.\n'
            + 'You are NOT a customer support agent and NOT a chatbot. You sound confident, experienced, polite and professional — like a senior consultant on a phone call.\n'
            + '\nFIRST RESPONSE RULE:\n'
            + 'The customer may already have received your welcome message.\n'
            + 'Never say greetings like Hi, Hello, Vanakkam, or ask "how can I help?" when the customer has already asked a question or shown interest.\n'
            + 'If the customer mentions a product, service, price, requirement, or buying intention, directly answer and continue the sales conversation.\n'
            + '\n## BUSINESS DATA\n'
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

            // Language style rules
            + tamilStyleRule
            + spokenStyleRule


            + '\n\n### NATURAL SPOKEN TAMIL RULE ###'
            + '\nUse everyday spoken Tamil.'
            + '\nUse நாங்க, உங்க, வேணும், பண்றோம், இருக்கோம்.'
            + '\nAvoid நாங்கள், வேண்டும், செய்கிறோம், இருக்கிறோம்.'
            + '\nKeep English business words naturally.'
            + '\nDo not translate business terms.'
            + '\nSound like a real Tamil business owner speaking on a phone call.'

            // Repeat & appointment rules
            + '\n\n### REPEAT & APPOINTMENT RULES — OVERRIDE THE SALES FLOW ###'
            + '\nNEVER REPEAT YOURSELF: NEVER send the same reply (or nearly the same reply) twice in a conversation. Check your previous replies above — if you already said it, say something DIFFERENT or shorter, or just acknowledge.'
            + '\nAFTER APPOINTMENT/DEMO/MEETING IS FIXED — STRICT: once a time is confirmed in this conversation, that topic is CLOSED. NEVER ask to book/fix/schedule again, never re-confirm the time, and STOP the sales flow closing questions. If the customer asks other questions after fixing, answer them normally with NO appointment talk. Only reopen if the CUSTOMER asks to change or cancel.'
            + '\nIf the customer sends only an acknowledgment after fixing ("ok", "சரி", "seri", "thanks"), reply with ONE short varied closing like "சரிங்க! 😊", "நன்றிங்க!" — a different one each time, without repeating the time.'
            + '\nIf the customer asks to fix an appointment that is ALREADY fixed — even in different words or language — say it is already done: "ஏற்கனவே fix பண்ணிட்டேன்ங்க — [day] [time]-க்கு!" Only treat as new if they mention a DIFFERENT day/time (that is a change — confirm the new time).'
            + '\nCLOSING LOOP RULE: When the customer sends only acknowledgments at the END of a conversation, reply with ONE short word/emoji only. NO closing tail sentences like "எதுவும் வேணும்னா contact பண்ணுங்க" — never repeat a closing.'

            // Email info sending
            // + '\n\n### SEND INFO BY EMAIL ###'
            // + '\nIf the customer asks to receive details/brochure/pricing/information (e.g. "send me details", "details அனுப்புங்க", "share pana mudiyuma"), offer to email it: "உங்க email-க்கு full details அனுப்பட்டுமா? Email ID சொல்லுங்க."'
            // + '\nWhen the customer gives their email address, confirm sending and append this EXACT marker at the END: [SEND_EMAIL:their-email-address:topic:intent].'
            // + '\nThe topic is the product or service being discussed, such as Website Development, Insurance, Gold Jewellery or WhatsApp Training.'
            // + '\nThe intent must be exactly one of these values: pricing, portfolio, brochure, features, contact, details, all.'
            // + '\nDetermine the intent from what the customer requested BEFORE giving their email address.'
            // + '\nExample: customer asks Website Development price and then gives email → [SEND_EMAIL:customer@gmail.com:Website Development:pricing]'
            // + '\nExample: customer asks previous website samples → [SEND_EMAIL:customer@gmail.com:Website Development:portfolio]'
            // + '\nExample: customer asks complete brochure → [SEND_EMAIL:customer@gmail.com:Website Development:brochure]'
            // + '\nUse "all" only when the customer clearly asks for all products, all services or complete business information.'
            // + '\nNever change a pricing request into details or all.'
            // + '\nExample reply: "சரிங்க, Website Development price details உங்க email-க்கு அனுப்பிட்டேன்! Check பண்ணுங்க. [SEND_EMAIL:customer@gmail.com:Website Development:pricing]"'
            // + '\nIf the customer asked about EVERYTHING/all services, use topic "all".'
            // + '\nOnly add the marker when you have a valid email address from the customer. Never invent an email. Never mention the marker itself.'
            // + '\nIf already sent once in this conversation, do not send again — tell them it was already sent.'
            // + '\nThis email flow OVERRIDES the automation phase rules — asking for the email ID is allowed in ANY phase when the customer requests information.'

            // Sales consultant flow
            + '\n\n### SALES FLOW — HOW TO RUN THE CONVERSATION ###'
            + '\nSTEP 1 — REQUIREMENT: If the customer already mentioned their business or requirement, DO NOT ask for it again. Go deeper instead. Example: customer says "I need health insurance" → wrong: "what business are you doing?" → correct: "உங்களுக்கா, family-க்கா insurance பாக்கறீங்க?"'
            + '\nSTEP 2 — QUALIFY: Once the requirement is known, mentally prepare the FIVE most important qualification questions for THAT customer\'s industry and need (insurance → family/age/existing policy; real estate → location/budget/purpose; education → course/level/goal; every industry gets its own questions). Only ask questions relevant to what ' + bizName2 + ' actually sells.'
            + '\nSTEP 3 — ONE AT A TIME: Ask ONLY ONE question per reply. Wait for the answer before the next question. NEVER ask two questions together. NEVER sound like an interviewer — weave the question naturally after giving value or answering their question first.'
            + '\nSTEP 4 — EACH QUESTION UNCOVERS ONE THING: current situation, biggest challenge, existing solution, goal, or urgency. No unnecessary questions. If they already answered something, never ask it again.'
            + '\nSTEP 5 — SILENT ANALYSIS: While talking, silently read their buying intention, budget readiness, urgency, decision authority and pain points from their answers. NEVER tell the customer you are analysing them.'
            + '\nSTEP 6 — BUDGET QUALIFICATION (MANDATORY): After you clearly understand the customer\'s requirement, you MUST naturally qualify their expected investment range BEFORE giving the final recommendation. This rule applies to EVERY business type. Do NOT assume the business is a website, insurance, real estate, jewellery, education, or any other specific industry. Instead, infer the correct wording from the business, products, and services in the training data. NEVER ask "What is your budget?" directly. Instead, ask naturally according to the conversation and business context. You may ask about their expected investment, whether they are looking for a basic, standard, or premium solution, or what range they have in mind. The wording should always match the business naturally. The following are ONLY examples and MUST NOT be repeated for every business: "Roughly என்ன investment plan பண்ணி இருக்கீங்க?", "Basic solution பாக்கறீங்களா, premium solution பாக்கறீங்களா?", "இதுக்கு என்ன range நினைச்சிருக்கீங்க?". Generate a similar question that best fits the current business and conversation. Collect the customer\'s investment expectation BEFORE giving a final recommendation, quotation, or proposal whenever it is relevant.'
            + '\nSTEP 7 — DECISION MAKER, INDIRECTLY: Never ask "are you the decision maker?". Instead: "இது மாதிரி decisions உங்க company-ல எப்படி நடக்கும்?"'
            + '\nSTEP 8 — TIMELINE, INDIRECTLY: Never ask "when will you buy?". Instead: "சரியான solution கிடைச்சா, எப்போ start பண்ணலாம்னு நினைக்கிறீங்க?"'
            + '\nSTEP 9 — SUMMARIZE: After the qualification questions, give a SHORT summary of your understanding in 1-2 sentences, using ONLY what the customer actually said. No assumptions.'
            + '\nSTEP 10 — RECOMMEND: Recommend ONLY the relevant products/services from the training data, and say WHY they fit this customer. Never push. Never recommend things not in the training data.'
            + '\nSTEP 11 — CLOSE NATURALLY: Move towards closing with natural questions: "இது உங்க business-க்கு எப்படி fit ஆகும்னு தோணுது?", "ஒரு demo பார்த்தா better-ஆ evaluate பண்ணலாமா?" Handle objections professionally — acknowledge, address, move forward.'
            + '\nSTEP 12 — NEXT STEP: When ready, guide to the next step: demo booking, appointment, registration, or payment. Then STOP selling (appointment rules above take over).'
            + '\nVOICE NOTE: All questions must be SHORT (under 12 words) — this is a voice conversation. One idea per sentence.'


            + '\n\n### FINAL VOICE LANGUAGE STYLE ###'
            + '\nKeep the sales consultant personality, but Tamil must always sound like everyday spoken Tamil.'
            + '\nDo not translate business words.'
            + '\nDo not use newspaper Tamil or textbook Tamil.'
            + '\nAnswer according to BUSINESS DATA and customer question. Only change the speaking style.';

        // Answer rules
        + '\n\n### ANSWER RULES ###'
            + '\nIf the customer asks "கேக்குதா?", "நான் பேசுறது கேக்குதா?", "hello hello", or tests whether you can hear them: reply "ஆமா, நல்லா கேக்குது! சொல்லுங்க." — this is a mic test, not an unclear message.'
            + '\nNEVER say "புரியல" or ask to repeat when the question is CLEAR. "புரியல" is ONLY for garbled/noise messages. If the question is clear but the training data has no answer, say so honestly and offer to connect them: "அது பத்தி full details எங்ககிட்ட இல்லங்க. நம்ம team-கிட்ட கேட்டு சொல்றேன் — உங்க number-க்கு call பண்ணட்டுமா?"'
            + '\nIf a service is listed in training data but has no description, describe it briefly from the name and offer details.'
            + '\nAlways answer the ACTUAL question directly first — no beating around the bush. Sales questions come AFTER the answer, never instead of it.'
            + '\nNEVER greet again after the first message — jump straight to the conversation.'
            + '\nFor EVERY question — give a SPECIFIC answer from training data. Do not give the same generic reply repeatedly.'
            + '\nINCOMPLETE SENTENCE RULE: If the customer message looks cut off or incomplete (e.g. just "உங்க", "நான் ஒரு", "where are") and does NOT make sense as a complete thought in this conversation context, reply: "நீங்க எதோ சொல்ல நினைக்கிறீங்க, ஆனா முழுசா சொல்லலைன்னு நினைக்கிறேன். Please முழு sentence-ஆ சொல்லுங்க." (in the selected language). But if the short message DOES make sense in context (e.g. "ஆமா", "10 மணிக்கு", "gold"), answer it normally.'
            + '\nTIME FORMAT RULE: NEVER say times in 24-hour format like "19:00" or "09:00-19:00". Always convert to natural spoken form in the selected language. Example Tamil: "காலை 9 மணி முதல் மாலை 7 மணி வரை open-ஆ இருக்கும்". Example English: "9 AM to 7 PM".';

        let aiResponse;
        try {
            aiResponse = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0.3,
                max_tokens: 120,
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

        // const reply = aiResponse.choices[0].message.content;
        // AIModel.saveGuestChat(ownerId, guestId, guestName, message, reply, (err2) => { });
        // res.status(200).json({ reply });

        let reply = aiResponse.choices[0].message.content;
        // ✅ Strip hallucinated foreign scripts (Korean/Chinese/Japanese chars from GPT)
        reply = reply.replace(/[\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FFF]+/g, '').replace(/\s{2,}/g, ' ').trim();

        const emailMatch = reply.match(
            /\[SEND_EMAIL:([^\]\s:]+@[^\]\s:]+\.[^\]\s:]+):([^:\]]+):([^\]]+)\]/i
        );

        if (emailMatch) {

            const customerEmail = emailMatch[1].trim();
            const emailTopic = emailMatch[2].trim();
            const emailIntent = emailMatch[3].trim().toLowerCase();

            const allowedEmailIntents = [
                'pricing',
                'portfolio',
                'brochure',
                'features',
                'contact',
                'details',
                'all'
            ];

            const safeEmailIntent = allowedEmailIntents.includes(emailIntent)
                ? emailIntent
                : 'details';

            reply = reply
                .replace(/\[SEND_EMAIL:[^\]]*\]/gi, '')
                .trim();

            const recentConversationText = [
                ...conversationHistory,
                {
                    role: 'assistant',
                    content: reply
                }
            ]
                .slice(-10)
                .map(item => {
                    const speaker =
                        item.role === 'user'
                            ? 'Customer'
                            : 'AI';

                    return `${speaker}: ${item.content}`;
                })
                .join('\n');

            sendInfoEmail({
                userId: ownerId,
                toEmail: customerEmail,
                basicData,
                masterData,
                topic: emailTopic,
                intent: safeEmailIntent,
                conversationText: recentConversationText
            })
                .then(() => {
                    console.log(
                        '[Email] Sent:',
                        customerEmail,
                        '| Topic:',
                        emailTopic,
                        '| Intent:',
                        safeEmailIntent
                    );
                })
                .catch(error => {
                    console.error(
                        '[Email] Send failed:',
                        error.message
                    );
                });
        }
        AIModel.saveGuestChat(ownerId, guestId, guestName, message, reply, (err2) => { });
        console.log("✅ GUEST CHAT REPLY READY");
        res.status(200).json({ reply });

        generateClientSummary(openai, guestId, conversationHistory, message, reply);

    } catch (error) {
        console.error('❌ guestChat error:', error.message);
        res.status(500).json({ error: 'AI response failed', details: error.message });
    }
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
<line 1: MOST IMPORTANT signal first, under 12 words>
<line 2: key details or "No specific details shared yet", under 12 words>
<line 3: current status / next step, under 12 words>
LINE 1 PRIORITY ORDER — pick the HIGHEST that applies:
1. Payment talk: "Wants to pay advance", "Asked payment methods for gold chain"
2. Ready to come / appointment: "Coming tomorrow 10 AM for bridal jewellery"
3. Strong interest: "Very interested in bridal collections, asked prices"
4. Contact shared: "Shared mobile number, interested in gold schemes"
5. General interest: "Asking about products and timings"
STRICT SCORING RULES:
9-10 = ONLY if customer talks about PAYMENT: how to pay, payment methods, advance, booking amount, EMI process, or ready to pay/buy now. Nothing else qualifies for 9-10.
7-8 = strong interest WITHOUT payment talk: asked price/rates, fixed or requested appointment, shared mobile/email, gave a date/time to visit, asked address to come.
5-6 = moderate: asked specific products by name, asked office name/address, long conversation with many questions, asked timings.
3-4 = mild: general questions, short conversation.
1-2 = little interest: off-topic, testing, single casual question.
IMPORTANT: price questions, appointments, contact sharing, product interest, visit plans ALL CAP at 8 maximum. Only payment discussion can score 9 or 10. No extra text.`
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

        if (err) {
            return res.status(500).json({ valid: false });
        }

        if (results.length > 0 && results[0].training_data) {

            const trainingData = results[0].training_data;

            const businessMatch = trainingData.match(
                /Business Name:\s*(.+)/
            );
            const businessName = businessMatch
                ? businessMatch[1].trim()
                : 'our business';
            return res.status(200).json({
                valid: true,
                business_name: businessName
            });
        } else {
            return res.status(200).json({
                valid: false
            });
        }
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
        const db = require('../config/db');
        // ✅ Lead counts by interest score (Hot 8-10, Warm 5-7, Cold 1-4)
        const leadSql = `SELECT
            COUNT(*) AS totalGuests,
            SUM(CASE WHEN interest_score >= 8 THEN 1 ELSE 0 END) AS leadHot,
            SUM(CASE WHEN interest_score >= 5 AND interest_score < 8 THEN 1 ELSE 0 END) AS leadWarm,
            SUM(CASE WHEN interest_score < 5 OR interest_score IS NULL THEN 1 ELSE 0 END) AS leadCold
            FROM guests WHERE owner_id = ?`;
        db.query(leadSql, [userId], (err4, leadRes) => {
            if (err4) return res.status(500).json({ error: 'Failed' });
            res.json({
                totalConversations: total,
                totalClients: parseInt(leadRes[0].totalGuests) || 0,
                leadHot: parseInt(leadRes[0].leadHot) || 0,
                leadWarm: parseInt(leadRes[0].leadWarm) || 0,
                leadCold: parseInt(leadRes[0].leadCold) || 0
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

        let rawMessage = returning ? introScript : introScript;

        // ✅ Extract products from training data for the introduction
        const productMatches = basicData.match(/Product or Service \d+:\s*(.+)/gi) || [];
        const productNames = productMatches
            .map(m => m.split(':')[1] ? m.split(':')[1].trim().split('-')[0].trim() : '')
            .filter(Boolean);
        // ✅ Short intro: only first 2 products + "and more" — keeps welcome brief
        // ✅ Short intro: only FIRST product + "and more" — keeps welcome brief
        const productsLine = productNames.length
            ? ' We offer ' + productNames[0] + ' and more.'
            : '';

        rawMessage = rawMessage;

        // ✅ Fixed mic line per language — NOT sent to Google Translate (it mangles it)
        const micLines = {
            'Tamil': ' நீங்க microphone-ஐ பயன்படுத்தி என்கூட பேசலாம். 🎙️ எங்க products-ல் உங்களுக்கு எது பத்தி தெரிஞ்சிக்கணும்?',
            'Hindi': ' Microphone 🎙️ से बात करके पूछिए! हमारे products में से आपको किसके बारे में जानना है?',
            'Telugu': ' Microphone 🎙️ ద్వారా మాట్లాడి అడగండి! మా products-లో మీకు దేని గురించి తెలుసుకోవాలి?',
            'Malayalam': ' Microphone 🎙️ ഉപയോഗിച്ച് സംസാരിക്കൂ! ഞങ്ങളുടെ products-ൽ ഏതിനെക്കുറിച്ച് അറിയണം?',
            'Kannada': ' Microphone 🎙️ ಬಳಸಿ ಮಾತನಾಡಿ! ನಮ್ಮ products-ಲ್ಲಿ ಯಾವುದರ ಬಗ್ಗೆ ತಿಳಿಯಬೇಕು?',
            'English': ' You can talk to me using the microphone 🎙️. Which of our products would you like to know about?'
        };
        const micLine = micLines[selectedLanguage] || micLines['English'];


        if (selectedLanguage === 'English') {
            const englishMsg = (rawMessage + micLine)
                .replace(/###\s*PRODUCTS\s*###/gi, productNames.join(', '))
                .replace(/###\s*MIC\s*###/gi, 'microphone 🎙️')
                .replace(/###\s*AINAME\s*###/gi, aiName)
                .replace(/###\s*BIZNAME\s*###/gi, businessName);
            return res.json({
                reply: englishMsg,
                products: productNames
            });
        }

        try {
            const axiosLib = require('axios');
            const langCodeMap = {
                'Tamil': 'ta', 'Hindi': 'hi', 'Telugu': 'te',
                'Malayalam': 'ml', 'Kannada': 'kn', 'English': 'en'
            };
            const targetLang = langCodeMap[selectedLanguage] || 'ta';
            const apiKey = process.env.GOOGLE_TRANSLATE_KEY;

            // ✅ Protect names from translation using placeholders
            let templateMsg = rawMessage
                .split(aiName).join('###AINAME###')
                .split(businessName).join('###BIZNAME###');
            if (productNames.length) {
                templateMsg = templateMsg.split(productNames.join(', ')).join('XX1XX');
            }
            templateMsg = templateMsg.split('microphone 🎙️').join('XX2XX');

            const translateRes = await axiosLib.post(
                `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
                { q: templateMsg, source: 'en', target: targetLang, format: 'text' }
            );
            let translated = translateRes.data.data.translations[0].translatedText;

            translated = translated
                .replace(/###\s*AINAME\s*###/gi, aiName)
                .replace(/###\s*BIZNAME\s*###/gi, businessName)
                .replace(/XX1XX/gi, productNames.join(', '))
                .replace(/XX2XX/gi, 'microphone 🎙️');

            return res.json({
                reply: translated + micLine,
                products: productNames
            });
        } catch (e) {
            const fallback = rawMessage
                .replace(/XX1XX/gi, productNames.join(', '))
                .replace(/XX2XX/gi, 'microphone 🎙️')
                .replace(/###\s*AINAME\s*###/gi, aiName)
                .replace(/###\s*BIZNAME\s*###/gi, businessName);
            return res.json({
                reply: fallback + micLine,
                products: productNames
            });
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
        // ✅ Business name removed from hints — Whisper hallucinated it on noise clips
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
        // ✅ Detect real audio format from magic bytes — extension must match content
        const buf = req.file.buffer;
        let ext = 'webm';
        if (buf.length > 4) {
            if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) {
                ext = 'ogg';   // "OggS"
            } else if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) {
                ext = 'webm';  // EBML header
            } else {
                // Unknown header — likely truncated/corrupted recording, skip transcription
                console.log('[Whisper] Unknown audio header, skipping. First bytes:', buf.slice(0, 4));
                return res.json({ text: '', language: null });
            }
        } else {
            return res.json({ text: '', language: null });
        }
        const tempPath = path.join(
            os.tmpdir(),
            `whisper_${Date.now()}.${ext}`
        );


        // ✅ Keep audio processing fast
        // Ignore extremely tiny corrupted recordings
        if (buf.length < 4000) {

            console.log(
                "[Whisper] Audio too small:",
                buf.length
            );

            return res.json({
                text: '',
                language: null
            });

        }


        fs.writeFileSync(
            tempPath,
            buf
        );
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

        // ✅ Strip hallucinated foreign scripts (Korean/Chinese/Japanese) from transcription
        rawText = rawText.replace(/[\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FFF]+/g, '').replace(/\s{2,}/g, ' ').trim();

        // ✅ Reject noise hallucinations (relaxed thresholds)
        if (transcription.segments && transcription.segments.length > 0) {
            const avgNoSpeech = transcription.segments.reduce((s, seg) => s + (seg.no_speech_prob || 0), 0) / transcription.segments.length;
            const avgLogProb = transcription.segments.reduce((s, seg) => s + (seg.avg_logprob || 0), 0) / transcription.segments.length;
            if (avgNoSpeech > 0.85 && avgLogProb < -1.2) {
                console.log('[Whisper] Rejected noise:', rawText, '| no_speech:', avgNoSpeech.toFixed(2), '| logprob:', avgLogProb.toFixed(2));
                rawText = '';
            }
        }

        // ✅ Reject prompt-echo hallucination (model returns the vocab hint instead of transcribing)
        if (rawText) {
            const promptWords = whisperPrompt.toLowerCase().split(',').map(w => w.trim()).filter(Boolean);
            const textWords = rawText.toLowerCase().replace(/[#:.]/g, ' ').split(/\s+/).filter(w => w.length > 2);
            if (textWords.length >= 3) {
                const matches = textWords.filter(w => promptWords.some(p => p === w || p.includes(w))).length;
                if (matches / textWords.length >= 0.7) {
                    console.log('[Whisper] Prompt-echo hallucination rejected:', rawText.substring(0, 80));
                    rawText = '';
                }
            }
            if (rawText.includes('###') || rawText.toLowerCase().startsWith('context:')) {
                console.log('[Whisper] Prompt-format leak rejected:', rawText.substring(0, 80));
                rawText = '';
            }
        }

        console.log('[Whisper] Detected lang:', rawLang, '| Text:', rawText);
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

        // ✅ Fix TTS pronunciation issues before speaking
        let speakText = cleanText
            // Rs. / Rs / ₹ → "rupees" (spoken properly, not R-S)
            .replace(/₹\s*/g, ' rupees ')
            .replace(/\bRs\.?\s*/gi, ' rupees ')
            // Remove ONLY microphone emoji + its attached suffix: "microphone 🎙️-ஐப்" → "microphone"
            .replace(/🎙️?\s*-[\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]+/gu, ' ')
            .replace(/🎙️?/gu, ' ')
            // Clean leftover double spaces
            .replace(/\s{2,}/g, ' ')
            .trim();

        // ✅ Phone numbers: force digit-by-digit reading with separators TTS can't merge
        speakText = speakText.replace(/\d{4,}/g, (num) => {
            return num.split('').join(', ');
        });

        // ✅ ElevenLabs voice ID — "Rachel" is natural warm female voice
        // Other options: 
        // Rachel: 21m00Tcm4TlvDq8ikWAM (warm, natural)
        // Bella: EXAVITQu4vr4xnSDxMaL (soft, friendly)
        // Elli: MF3mGyEYCl7XYWbV9V6O (young, energetic)
        // ✅ Select voice based on language
        // ✅ Use language-specific voices
        const voiceMap = {
            // 'tamil': 'FpofsrpOfLubBf5z8kSb',  
            // 'tamil': 'wLIQpmGi7jT7aiEmDsE3', // janani tanglish friend
            'tamil': 'dOQi5SePW2oLH7pdyeq3', // thendral cheerful
            'hindi': 'XrExE9yKIg1WjnnlVkGX',
            'telugu': 'XrExE9yKIg1WjnnlVkGX',
            'malayalam': 'XrExE9yKIg1WjnnlVkGX',
            'kannada': 'XrExE9yKIg1WjnnlVkGX',
            'english': '21m00Tcm4TlvDq8ikWAM',
        };

        const voiceId = voiceMap[language?.toLowerCase()] || '21m00Tcm4TlvDq8ikWAM';

        // ✅ Tell ElevenLabs the exact language — no guessing
        const elevenLangMap = {
            'tamil': 'ta', 'hindi': 'hi', 'telugu': 'te',
            'malayalam': 'ml', 'kannada': 'kn', 'english': 'en'
        };
        const elevenLangCode = elevenLangMap[language?.toLowerCase()];

        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3`,
            {
                text: speakText,
                model_id: 'eleven_flash_v2_5',
                ...(elevenLangCode && { language_code: elevenLangCode }),
                voice_settings: {
                    stability: 0.75,
                    similarity_boost: 0.65,
                    style: 0.25,
                    use_speaker_boost: true,
                    // speed: 0.85
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
    trainAI, testBusinessEmailConnection, saveMasterAI, getTraining, chatWithAI, updateLang, getLang,
    getConversations, registerGuest, guestChat, checkOwner, checkGuest,
    getGuestConversationsByGuestId, getAISuggestions, getDashboardStats,
    getClients, getQuestions, saveQuestion, updateQuestion, deleteQuestion,
    guestWelcome, extractFileText, fetchWebsiteContent, whisperTranscribe, textToSpeech
};