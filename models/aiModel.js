const db = require('../config/db');

const AIModel = {

    saveTraining: (data, callback) => {
        const sql = `
INSERT INTO ai_training (user_id, name, email, mobile, training_data)
VALUES (?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
training_data = VALUES(training_data)
`;

        db.query(sql, [
            data.userId,
            data.name,
            data.email,
            data.mobile,
            data.trainingData
        ], callback);
    },

    getTrainingByUser: (userId, callback) => {
        const sql = 'SELECT * FROM ai_training WHERE user_id = ? LIMIT 1';
        db.query(sql, [userId], callback);
    },

    // 🔥 Get training data
    getTrainingData: (userId, callback) => {
        const sql = 'SELECT training_data FROM ai_training WHERE user_id = ? LIMIT 1';
        db.query(sql, [userId], callback);
    },

    // 🔥 Save chat history
    saveChat: (userId, message, reply, callback) => {
        const sql = `
            INSERT INTO conversations (user_id, message, reply)
            VALUES (?, ?, ?)
        `;

        db.query(sql, [userId, message, reply], callback);
    }

};


module.exports = AIModel;