const db = require('../config/db');

const AIModel = {

    getDashboardStats: (userId, callback) => {
        const sql = `
    SELECT
      (
        SELECT COUNT(*)
        FROM guest_conversations
        WHERE owner_id = ?
      ) AS totalConversations,

      (
        SELECT COUNT(DISTINCT guest_id)
        FROM guest_conversations
        WHERE owner_id = ?
      ) AS totalClients,

      u.current_plan AS currentPlan,

      COALESCE(
        u.character_limit,
        0
      ) AS characterLimit,

      COALESCE(u.characters_used, 0) AS charactersUsed,

        u.subscription_expires_at AS subscriptionExpiresAt,

      GREATEST(
        COALESCE(u.character_limit, 0) -
        COALESCE(u.characters_used, 0),
        0
      ) AS characterBalance

    FROM users u
    WHERE u.user_id = ?
    LIMIT 1
  `;

        db.query(
            sql,
            [userId, userId, userId],
            callback
        );
    },

    checkOwnerCharacterBalance: (
  ownerId,
  callback
) => {
  const sql = `
    SELECT
      id,
      status,
      current_plan AS currentPlan,
      character_limit AS characterLimit,
      characters_used AS charactersUsed,

      GREATEST(
        character_limit - characters_used,
        0
      ) AS characterBalance,

      subscription_expires_at AS expiresAt,

      CASE
        WHEN subscription_expires_at IS NULL
          THEN 1
        WHEN subscription_expires_at <= NOW()
          THEN 1
        ELSE 0
      END AS isExpired

    FROM users
    WHERE user_id = ?
    AND role = 'owner'
    LIMIT 1
  `;

  db.query(
    sql,
    [ownerId],
    (error, results) => {
      if (error) {
        return callback(error);
      }

      if (!results || results.length === 0) {
        return callback(null, {
          ownerFound: false,
          allowed: false
        });
      }

      const owner = results[0];

      const characterLimit =
        Number(owner.characterLimit) || 0;

      const charactersUsed =
        Number(owner.charactersUsed) || 0;

      const characterBalance =
        Math.max(
          characterLimit - charactersUsed,
          0
        );

      const isExpired =
        Number(owner.isExpired) === 1;

      return callback(null, {
        ownerFound: true,

        allowed:
          owner.status === 'active' &&
          !isExpired &&
          characterBalance > 0,

        status: owner.status,
        currentPlan: owner.currentPlan,
        characterLimit,
        charactersUsed,
        characterBalance,
        expiresAt: owner.expiresAt,
        isExpired
      });
    }
  );
},

consumeOwnerCharacters: (
  ownerId,
  charactersToUse,
  callback
) => {
  const updateSql = `
    UPDATE users
    SET characters_used =
      characters_used + ?
    WHERE user_id = ?
    AND role = 'owner'
    AND status = 'active'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at > NOW()
    AND character_limit > characters_used
    AND characters_used + ? <= character_limit
  `;

  db.query(
    updateSql,
    [
      charactersToUse,
      ownerId,
      charactersToUse
    ],
    (updateError, updateResult) => {
      if (updateError) {
        return callback(updateError);
      }

      const selectSql = `
        SELECT
          current_plan AS currentPlan,
          character_limit AS characterLimit,
          characters_used AS charactersUsed,

          GREATEST(
            character_limit - characters_used,
            0
          ) AS characterBalance,

          subscription_expires_at AS expiresAt,

          CASE
            WHEN subscription_expires_at IS NULL
              THEN 1
            WHEN subscription_expires_at <= NOW()
              THEN 1
            ELSE 0
          END AS isExpired

        FROM users
        WHERE user_id = ?
        AND role = 'owner'
        LIMIT 1
      `;

      db.query(
        selectSql,
        [ownerId],
        (selectError, results) => {
          if (selectError) {
            return callback(selectError);
          }

          if (!results || results.length === 0) {
            return callback(null, {
              ownerFound: false,
              consumed: false
            });
          }

          const usage = results[0];

          return callback(null, {
            ownerFound: true,

            consumed:
              updateResult.affectedRows === 1,

            currentPlan:
              usage.currentPlan,

            characterLimit:
              Number(usage.characterLimit) || 0,

            charactersUsed:
              Number(usage.charactersUsed) || 0,

            characterBalance:
              Number(usage.characterBalance) || 0,

            expiresAt:
              usage.expiresAt,

            isExpired:
              Number(usage.isExpired) === 1
          });
        }
      );
    }
  );
},

    saveTraining: (data, callback) => {
        const sql = `
        INSERT INTO ai_training (user_id, name, email, mobile, training_data)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE training_data = VALUES(training_data)
    `;

        db.query(
            sql,
            [
                data.userId,
                data.name,
                data.email,
                data.mobile,
                data.trainingData
            ],
            callback
        );
    },

    saveBusinessEmailSettings: (data, callback) => {

        const businessEmail = String(
            data.businessEmail || ''
        )
            .trim()
            .toLowerCase();

        const businessAppPassword = String(
            data.businessAppPassword || ''
        )
            .replace(/\s+/g, '')
            .trim();

        const sql = `
        INSERT INTO business_email_settings
        (
            user_id,
            business_email,
            app_password
        )
        VALUES (?, ?, ?)

        ON DUPLICATE KEY UPDATE
            business_email = VALUES(business_email),
            app_password = VALUES(app_password),
            updated_at = CURRENT_TIMESTAMP
    `;

        db.query(
            sql,
            [
                data.userId,
                businessEmail,
                businessAppPassword
            ],
            callback
        );
    },

    getBusinessEmailSettings: (userId, callback) => {

        const sql = `
        SELECT
            business_email,
            app_password
        FROM business_email_settings
        WHERE user_id = ?
        LIMIT 1
    `;

        db.query(
            sql,
            [userId],
            callback
        );
    },

    saveBusinessWhatsappSettings: (data, callback) => {

        const sql = `
    INSERT INTO business_whatsapp_settings
    (
        user_id,
        wati_endpoint,
        wati_token,
        template_name
    )

    VALUES (?, ?, ?, ?)

    ON DUPLICATE KEY UPDATE

        wati_endpoint = VALUES(wati_endpoint),
        wati_token = VALUES(wati_token),
        template_name = VALUES(template_name)

    `;


        db.query(
            sql,
            [
                data.userId,
                data.watiEndpoint,
                data.watiToken,
                data.templateName
            ],
            callback
        );

    },

    getBusinessWhatsappSettings: (userId, callback) => {

        const sql = `

    SELECT

        wati_endpoint,
        wati_token,
        template_name

    FROM business_whatsapp_settings

    WHERE user_id = ?

    LIMIT 1

    `;


        db.query(
            sql,
            [userId],
            callback
        );


    },

    getSharingAvailability: (userId, callback) => {

        const sql = `
        SELECT
            EXISTS(
                SELECT 1
                FROM business_email_settings
                WHERE user_id = ?
                  AND business_email IS NOT NULL
                  AND TRIM(business_email) <> ''
                  AND app_password IS NOT NULL
                  AND TRIM(app_password) <> ''
            ) AS emailAvailable,

            EXISTS(
                SELECT 1
                FROM business_whatsapp_settings
                WHERE user_id = ?
                  AND wati_endpoint IS NOT NULL
                  AND TRIM(wati_endpoint) <> ''
                  AND wati_token IS NOT NULL
                  AND TRIM(wati_token) <> ''
                  AND template_name IS NOT NULL
                  AND TRIM(template_name) <> ''
            ) AS whatsappAvailable
    `;

        db.query(
            sql,
            [userId, userId],
            callback
        );
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

    getGuestConversationsByGuestId: (
  guestId,
  callback
) => {
  const sql = `
    SELECT *
    FROM guest_conversations
    WHERE guest_id = ?
    ORDER BY created_at ASC
  `;

  db.query(sql, [guestId], callback);
},

getConversationReportAccess: (
  userId,
  guestId,
  callback
) => {
  const sql = `
    SELECT
      u.id AS ownerId,
      u.user_id AS ownerUserId,
      u.current_plan AS currentPlan,
      u.status,
      u.subscription_expires_at AS expiresAt,

      g.id AS guestId,
      g.name AS guestName,
      g.mobile AS guestMobile

    FROM users u

    INNER JOIN guests g
      ON g.owner_id = u.user_id

    WHERE u.id = ?
    AND g.id = ?
    AND u.role = 'owner'
    LIMIT 1
  `;

  db.query(
    sql,
    [userId, guestId],
    callback
  );
},

    getClients: (userId, callback) => {
        const query = `
        SELECT 
            g.id,
            g.name,
            g.mobile,
            g.summary,
            g.expected_product,
            g.expected_value,
            g.expected_closing_date,
            g.interest_score,
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
        GROUP BY g.id, g.name, g.mobile, g.summary, g.interest_score
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
    },

    updateGuestSummary: (guestId, summary, callback) => {
        const sql = `UPDATE guests SET summary = ? WHERE id = ?`;
        db.query(sql, [summary, guestId], callback);
    },

    updateGuestLeadDetails: (guestId, product, value, closingDate, callback) => {

        const sql = `
    UPDATE guests 
    SET 
        expected_product = ?,
        expected_value = ?,
        expected_closing_date = ?
    WHERE id = ?
    `;

        db.query(
            sql,
            [
                product,
                value,
                closingDate,
                guestId
            ],
            callback
        );
    },

    updateGuestScore: (guestId, score, callback) => {
        const sql = `UPDATE guests SET interest_score = ? WHERE id = ?`;
        db.query(sql, [score, guestId], callback);
    },

    saveShareFile: (data, callback) => {

        const sql = `
        INSERT INTO shareable_files
        (
            user_id,
            file_title,
            file_name,
            file_path,
            file_type
        )
        VALUES (?, ?, ?, ?, ?)
    `;

        db.query(
            sql,
            [
                data.userId,
                data.fileTitle,
                data.fileName,
                data.filePath,
                data.fileType
            ],
            callback
        );
    },

    getShareFiles: (userId, callback) => {

        const sql = `
    SELECT *
    FROM shareable_files
    WHERE user_id=?
    ORDER BY id DESC
    `;

        db.query(sql, [userId], callback);

    },


    deleteShareFile: (id, callback) => {

        const sql = `
    DELETE FROM shareable_files
    WHERE id=?
    `;

        db.query(sql, [id], callback);

    },
};

module.exports = AIModel;