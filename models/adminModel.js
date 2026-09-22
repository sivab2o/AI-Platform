const db = require('../config/db');

const AdminModel = {
  getSummary: (callback) => {
    const sql = `
      SELECT
        (
          SELECT COUNT(*)
          FROM users
          WHERE role = 'owner'
        ) AS totalOwners,

        (
          SELECT COUNT(*)
          FROM users
          WHERE role = 'owner'
          AND status = 'active'
        ) AS activeOwners,

        (
          SELECT COUNT(*)
          FROM users
          WHERE role = 'owner'
          AND status = 'inactive'
        ) AS inactiveOwners,

        (
          SELECT COUNT(*)
          FROM guests
        ) AS totalGuests,

        (
          SELECT COUNT(*)
          FROM guest_conversations
        ) AS totalConversations,

        (
          SELECT COUNT(*)
          FROM shareable_files
        ) AS totalFiles
    `;

    db.query(sql, callback);
  },

  getOwners: (callback) => {
    const sql = `
      SELECT
        u.id,
        u.user_id,
        u.name,
        u.email,
        u.mobile,
        u.lang,
        u.role,
       u.status,
u.created_at,
u.current_plan,
u.character_limit,
u.characters_used,
u.subscription_expires_at,

GREATEST(
  u.character_limit - u.characters_used,
  0
) AS character_balance,

        (
          SELECT COUNT(*)
          FROM guests g
          WHERE g.owner_id = u.user_id
        ) AS totalGuests,

        (
          SELECT COUNT(*)
          FROM guest_conversations gc
          WHERE gc.owner_id = u.user_id
        ) AS totalConversations,

        (
          SELECT COUNT(*)
          FROM shareable_files sf
          WHERE sf.user_id = u.user_id
        ) AS totalFiles,

        EXISTS(
          SELECT 1
          FROM business_email_settings bes
          WHERE bes.user_id = u.user_id
        ) AS emailConfigured,

        EXISTS(
          SELECT 1
          FROM business_whatsapp_settings bws
          WHERE bws.user_id = u.user_id
        ) AS whatsappConfigured

      FROM users u
      WHERE u.role = 'owner'
      ORDER BY u.id DESC
    `;

    db.query(sql, callback);
  },

  getOwnerById: (ownerId, callback) => {
    const sql = `
      SELECT
        u.id,
        u.user_id,
        u.name,
        u.email,
        u.mobile,
        u.lang,
        u.role,
       u.status,
u.created_at,
u.current_plan,
u.character_limit,
u.characters_used,
u.subscription_expires_at,

GREATEST(
  u.character_limit - u.characters_used,
  0
) AS character_balance,

        (
          SELECT COUNT(*)
          FROM guests g
          WHERE g.owner_id = u.user_id
        ) AS totalGuests,

        (
          SELECT COUNT(*)
          FROM guest_conversations gc
          WHERE gc.owner_id = u.user_id
        ) AS totalConversations,

        (
          SELECT COUNT(*)
          FROM shareable_files sf
          WHERE sf.user_id = u.user_id
        ) AS totalFiles,

        EXISTS(
          SELECT 1
          FROM business_email_settings bes
          WHERE bes.user_id = u.user_id
        ) AS emailConfigured,

        EXISTS(
          SELECT 1
          FROM business_whatsapp_settings bws
          WHERE bws.user_id = u.user_id
        ) AS whatsappConfigured

      FROM users u
      WHERE u.id = ?
      AND u.role = 'owner'
      LIMIT 1
    `;

    db.query(sql, [ownerId], callback);
  },

  updateOwnerStatus: (
    ownerId,
    status,
    callback
  ) => {
    const sql = `
      UPDATE users
      SET status = ?
      WHERE id = ?
      AND role = 'owner'
    `;

    db.query(
      sql,
      [status, ownerId],
      callback
    );
    },

updateOwnerCharacterLimit: (
  ownerId,
  characterLimit,
  resetUsage,
  callback
) => {
  const sql = resetUsage
    ? `
        UPDATE users
        SET
          character_limit = ?,
          characters_used = 0
        WHERE id = ?
        AND role = 'owner'
      `
    : `
        UPDATE users
        SET character_limit = ?
        WHERE id = ?
        AND role = 'owner'
      `;

  db.query(
    sql,
    [characterLimit, ownerId],
    callback
  );
}
};

module.exports = AdminModel;