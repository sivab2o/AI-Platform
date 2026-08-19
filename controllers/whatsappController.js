const AIModel = require('../models/aiModel.js');
const OpenAI = require('openai');
const twilio = require('twilio');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const handleMessage = async (req, res) => {
    try {
        const from = req.body.From;
        const text = req.body.Body;


        // ✅ Get training data for user id 1 (your account)
        AIModel.getTrainingData(1, async (err, results) => {
            if (err || results.length === 0) {
                await sendReply(from, "Sorry, AI is not configured yet.");
                return res.sendStatus(200);
            }

            const trainingData = results[0].training_data;

            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

                const aiResponse = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a business assistant for this specific business.

                            Here is the business training data:
                            ${trainingData}

                            STRICT RULES:
                            1. ONLY answer questions related to this business.
                            2. If someone asks anything NOT related to this business, respond with: "I can only help with questions about our business. Please ask me about our services, pricing, or how we can help you!"
                            3. Always be polite.
                            4. Reply in the same language the customer uses.
                            5. Keep replies short and clear for WhatsApp.`
                        },
                        { role: 'user', content: text }
                    ]
                });

                const reply = aiResponse.choices[0].message.content;

                // ✅ Send reply on WhatsApp
                await sendReply(from, reply);

                // ✅ Save conversation to DB
                AIModel.saveWhatsappChat(1, from, text, reply, (err2) => {
                });

            } catch (error) {
                console.error('AI error:', error);
                await sendReply(from, "Sorry, something went wrong. Please try again.");
            }
        });

        res.sendStatus(200);

    } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(500);
    }
};

const sendReply = async (to, message) => {
    await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: to,
        body: message
    });
};

module.exports = { handleMessage };