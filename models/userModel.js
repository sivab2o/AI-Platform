// models/userModel.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  // Method to find a user by email
  findByEmail: (email, callback) => {
    const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    db.query(sql, [email], callback);
  },

  findById: (id, callback) => {
    const sql = `
    SELECT
      id,
      user_id,
      name,
      email,
      mobile,
      lang,
      role,
      status,
      current_plan,
      character_limit,
      characters_used,
      GREATEST(
        character_limit - characters_used,
        0
      ) AS character_balance,
      created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `;

    db.query(sql, [id], callback);
  },

  createUser: (
    name,
    email,
    mobile,
    password,
    planCode,
    characterLimit,
    callback
  ) => {
    const safeCharacterLimit =
      Number(characterLimit);

    if (
      !Number.isSafeInteger(safeCharacterLimit) ||
      safeCharacterLimit < 0
    ) {
      return callback(
        new Error('Invalid character limit')
      );
    }

    bcrypt.hash(
      password,
      10,
      (hashError, hashedPassword) => {
        if (hashError) {
          return callback(hashError);
        }

        const insertSql = `
        INSERT INTO users (
          name,
          email,
          mobile,
          password,
          current_plan,
          character_limit,
          characters_used
        )
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `;

        db.query(
          insertSql,
          [
            name,
            email,
            mobile,
            hashedPassword,
            planCode || null,
            safeCharacterLimit
          ],
          (insertError, result) => {
            if (insertError) {
              return callback(insertError);
            }

            const insertedId =
              result.insertId;

            const customUserId =
              `LF${insertedId}`;

            const updateSql = `
            UPDATE users
            SET user_id = ?
            WHERE id = ?
          `;

            db.query(
              updateSql,
              [customUserId, insertedId],
              (updateError) => {
                if (updateError) {
                  return callback(updateError);
                }

                return callback(null, {
                  id: insertedId,
                  user_id: customUserId,
                  current_plan:
                    planCode || null,
                  character_limit:
                    safeCharacterLimit,
                  characters_used: 0,
                  character_balance:
                    safeCharacterLimit
                });
              }
            );
          }
        );
      }
    );
  }
};

module.exports = User;