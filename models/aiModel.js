const db = require('../config/db');

const AIModel = {

    getDashboardStats: (userId, callback) => {
        const sql = `
        SELECT
            (SELECT COUNT(*) FROM guest_conversations WHERE owner_id = ?) AS totalConversations,
            (SELECT COUNT(DISTINCT guest_id) FROM guest_conversations WHERE owner_id = ?) AS totalClients
        FROM dual
    `;
        db.query(sql, [userId, userId], callback);
    },

    saveTraining: (data, callback) => {
        const sql = `
            INSERT INTO ai_training (user_id, name, email, mobile, training_data)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE training_data = VALUES(training_data)
        `;
        db.query(sql, [data.userId, data.name, data.email, data.mobile, data.trainingData], callback);
    },

    saveMasterTraining: (userId, masterData, callback) => {
        const sql = `
        INSERT INTO ai_training (user_id, master_data)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE master_data = VALUES(master_data)
    `;
        db.query(sql, [userId, masterData], callback);
    },

    getTrainingByUser: (userId, callback) => {
        const sql = 'SELECT * FROM ai_training WHERE user_id = ? LIMIT 1';
        db.query(sql, [userId], callback);
    },

    getTrainingData: (userId, callback) => {
        const sql = 'SELECT training_data, master_data FROM ai_training WHERE user_id = ? LIMIT 1';
        db.query(sql, [userId], callback);
    },

    saveChat: (userId, message, reply, source = 'chat', callback) => {
        const sql = `INSERT INTO conversations (user_id, message, reply, source) VALUES (?, ?, ?, ?)`;
        db.query(sql, [userId, message, reply, source], callback);
    },

    saveWhatsappChat: (userId, whatsappNumber, message, reply, callback) => {
        const sql = `INSERT INTO conversations (user_id, whatsapp_number, message, reply, source) VALUES (?, ?, ?, ?, 'whatsapp')`;
        db.query(sql, [userId, whatsappNumber, message, reply], callback);
    },

    getConversations: (userId, callback) => {
        const sql = 'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at ASC LIMIT 100';
        db.query(sql, [userId], callback);
    },

    updateUserLang: (userId, lang, callback) => {
        const sql = 'UPDATE users SET lang = ? WHERE id = ?';
        db.query(sql, [lang, userId], callback);
    },

    getUserLang: (userId, callback) => {
        const sql = 'SELECT lang FROM users WHERE id = ?';
        db.query(sql, [userId], callback);
    },

    // ✅ Guest methods
    registerGuest: (name, email, mobile, ownerId, callback) => {
        const sql = `INSERT INTO guests (name, email, mobile, owner_id) VALUES (?, ?, ?, ?)`;
        db.query(sql, [name, email, mobile, ownerId], callback);
    },

    saveGuestChat: (ownerId, guestId, guestName, message, reply, callback) => {
        const sql = `INSERT INTO guest_conversations (owner_id, guest_id, guest_name, message, reply) VALUES (?, ?, ?, ?, ?)`;
        db.query(sql, [ownerId, guestId, guestName, message, reply], callback);
    },

    getGuestConversations: (ownerId, callback) => {
        const sql = `
            SELECT gc.*, g.name, g.email, g.mobile 
            FROM guest_conversations gc
            LEFT JOIN guests g ON gc.guest_id = g.id
            WHERE gc.owner_id = ?
            ORDER BY gc.created_at ASC
        `;
        db.query(sql, [ownerId], callback);
    },

    findGuest: (email, mobile, ownerId, callback) => {
        const sql = `SELECT * FROM guests WHERE mobile = ? AND owner_id = ? LIMIT 1`;
        db.query(sql, [mobile, ownerId], callback);
    },

    getGuestConversationsByGuestId: (guestId, callback) => {
        const sql = `SELECT * FROM guest_conversations WHERE guest_id = ? ORDER BY created_at ASC`;
        db.query(sql, [guestId], callback);
    },

    getClients: (userId, callback) => {
        const query = `
        SELECT 
            g.id,
            g.name,
            g.mobile,
            MAX(gc.created_at) as last_active,
            COUNT(gc.id) as total_messages,
            MAX(gc.message) as last_message,
            MAX(CASE WHEN gc.message LIKE '%buy%' 
                OR gc.message LIKE '%purchase%' 
                OR gc.message LIKE '%contact%'
                OR gc.message LIKE '%call%'
                OR gc.message LIKE '%owner%'
                OR gc.message LIKE '%price%'
                OR gc.message LIKE '%cost%'
                OR gc.reply LIKE '%responsible%'
                OR gc.reply LIKE '%contact%'
                THEN 1 ELSE 0 END) as call_recommended
        FROM guests g
        LEFT JOIN guest_conversations gc ON g.id = gc.guest_id
        WHERE g.owner_id = ?
        GROUP BY g.id, g.name, g.mobile
        ORDER BY last_active DESC
    `;
        db.query(query, [userId], callback);
    },

    // ✅ Training Questions CRUD
    getQuestions: (ownerId, callback) => {
        const sql = `SELECT * FROM training_questions WHERE owner_id = ? ORDER BY sort_order ASC`;
        db.query(sql, [ownerId], callback);
    },

    saveQuestion: (data, callback) => {
        const sql = `INSERT INTO training_questions (owner_id, question, question_type, options, has_others, sort_order) VALUES (?, ?, ?, ?, ?, ?)`;
        db.query(sql, [data.ownerId, data.question, data.questionType, JSON.stringify(data.options), data.hasOthers, data.sortOrder], callback);
    },

    updateQuestion: (id, data, callback) => {
        const sql = `UPDATE training_questions SET question=?, question_type=?, options=?, has_others=?, sort_order=? WHERE id=?`;
        db.query(sql, [data.question, data.questionType, JSON.stringify(data.options), data.hasOthers, data.sortOrder, id], callback);
    },

    deleteQuestion: (id, callback) => {
        const sql = `DELETE FROM training_questions WHERE id=?`;
        db.query(sql, [id], callback);
    }
};

module.exports = AIModel;