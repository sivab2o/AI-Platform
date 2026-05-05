const AIModel = require('../models/aiModel.js');

const trainAI = (req, res) => {
    const { userId, name, email, mobile, trainingData } = req.body;

    if (!trainingData || trainingData.trim() === '') {
        return res.status(400).json({ message: 'Training data required' });
    }

    AIModel.saveTraining({
        userId,
        name,
        email,
        mobile,
        trainingData
    }, (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Failed to save training' });
        }

        res.status(200).json({
            message: 'Training data saved successfully'
        });
    });
};

const getTraining = (req, res) => {
  const userId = req.params.userId;

  AIModel.getTrainingByUser(userId, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching training data' });
    }

    if (results.length > 0) {
      return res.status(200).json(results[0]);
    } else {
      return res.status(200).json(null);
    }
  });
};

const chatWithAI = (req, res) => {
    const { userId, message } = req.body;

    if (!message || message.trim() === '') {
        return res.status(400).json({ message: 'Message required' });
    }

    // 🔥 Get training data for that user
    AIModel.getTrainingData(userId, async (err, results) => {

        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Error fetching training data' });
        }

        if (results.length === 0) {
            return res.status(400).json({ message: 'AI not trained yet' });
        }

        const trainingData = results[0].training_data;

        try {
            // 🔥 Call OpenAI
            const OpenAI = require('openai');
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            const aiResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a business assistant. Use this data: ${trainingData}`
                    },
                    {
                        role: "user",
                        content: message
                    }
                ]
            });

            const reply = aiResponse.choices[0].message.content;

            // 🔥 Save chat (optional but important)
            AIModel.saveChat(userId, message, reply, (err2) => {
                if (err2) console.log(err2);
            });

            res.status(200).json({
                reply: reply
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'AI response failed' });
        }

    });
};

module.exports = { trainAI, getTraining, chatWithAI };