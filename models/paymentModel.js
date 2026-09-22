const db = require('../config/db');

const PaymentModel = {
  saveSignupPayment: (
    paymentData,
    callback
  ) => {
    db.beginTransaction(transactionError => {
      if (transactionError) {
        return callback(transactionError);
      }

      const expiryDate = paymentData.paidAt
        ? new Date(paymentData.paidAt)
        : new Date();

      expiryDate.setDate(
        expiryDate.getDate() +
        Number(paymentData.validityDays || 0)
      );

      const paymentSql = `
      INSERT INTO signup_payments (
        owner_id,
        owner_user_id,
        plan_code,
        plan_name,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        credits_purchased,
        validity_days,
        original_price,
        actual_plan_price,
        discount_percent,
        test_payment,
        character_limit,
        payment_type,
        currency,
        payment_status,
        payment_method,
        paid_at
      )
      VALUES (
  ?, ?, ?, ?, ?, ?,
  ?, 0, ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?
)
    `;

      const paymentValues = [
        paymentData.ownerId,
        paymentData.ownerUserId,
        paymentData.planCode,
        paymentData.planName,
        paymentData.orderId,
        paymentData.paymentId,
        // Actual Razorpay testing amount in paise
        paymentData.amount,
        paymentData.validityDays,
        paymentData.originalPrice ??
        paymentData.originalPlanPrice,
        paymentData.actualPlanPrice,
        paymentData.discountPercent,
        paymentData.testPayment,
        paymentData.characterLimit,

        paymentData.paymentType,
        paymentData.currency,
        paymentData.status,
        paymentData.method,
        paymentData.paidAt
      ];

      db.query(
        paymentSql,
        paymentValues,
        paymentError => {
          if (paymentError) {
            return db.rollback(() => {
              callback(paymentError);
            });
          }

          const characterSql = `
  UPDATE users
  SET
    current_plan = ?,
    character_limit = ?,
    characters_used = 0,
    subscription_expires_at = ?
  WHERE id = ?
  AND role = 'owner'
`;

          db.query(
            characterSql,
            [
              paymentData.planCode,
              paymentData.characterLimit,
              expiryDate,
              paymentData.ownerId
            ],
            (characterError, characterResult) => {
              if (characterError) {
                return db.rollback(() => {
                  callback(characterError);
                });
              }

              if (characterResult.affectedRows !== 1) {
                return db.rollback(() => {
                  callback(
                    new Error(
                      'Owner character balance could not be assigned'
                    )
                  );
                });
              }

              db.commit(commitError => {
                if (commitError) {
                  return db.rollback(() => {
                    callback(commitError);
                  });
                }

                return callback(null, {
                  planCode:
                    paymentData.planCode,

                  characterLimit:
                    paymentData.characterLimit,

                  charactersUsed: 0,

                  characterBalance:
                    paymentData.characterLimit,

                  validityDays:
                    paymentData.validityDays,

                  subscriptionExpiresAt:
                    expiryDate
                });
              });
            }
          );
        }
      );
    });
  },


  getOwnerPayments: (
    ownerId,
    callback
  ) => {
    const sql = `
    SELECT
      sp.id,

      sp.plan_code AS planCode,
      sp.plan_name AS planName,

      sp.original_price AS originalPrice,
      sp.actual_plan_price AS actualPlanPrice,
      sp.discount_percent AS discountPercent,
      sp.test_payment AS testPayment,

      sp.character_limit AS purchasedCharacters,
sp.validity_days AS validityDays,

u.current_plan AS currentPlan,
u.subscription_expires_at AS subscriptionExpiresAt,

CASE
  WHEN u.subscription_expires_at IS NULL
    THEN 1
  WHEN u.subscription_expires_at <= NOW()
    THEN 1
  ELSE 0
END AS isExpired,

u.character_limit AS totalCharacters,
      u.characters_used AS charactersUsed,

      GREATEST(
        u.character_limit - u.characters_used,
        0
      ) AS balanceCharacters,

      sp.razorpay_order_id AS orderId,
      sp.razorpay_payment_id AS paymentId,

      sp.amount AS amount,
      sp.amount AS amountPaidPaise,
      sp.currency,
      sp.payment_status AS status,
      sp.payment_method AS method,
      sp.payment_type AS paymentType,
      sp.paid_at AS paidAt

    FROM signup_payments sp

    INNER JOIN users u
      ON u.id = sp.owner_id

    WHERE sp.owner_id = ?
    ORDER BY sp.paid_at DESC
  `;

    db.query(sql, [ownerId], callback);
  },

  getAllPayments: (callback) => {
    const sql = `
    SELECT
      sp.id,

      sp.owner_id AS ownerId,
      sp.owner_user_id AS ownerUserId,

      u.name AS ownerName,
      u.email,
      u.mobile,

      sp.plan_code AS planCode,
      sp.plan_name AS planName,

      sp.original_price AS originalPrice,
      sp.actual_plan_price AS actualPlanPrice,
      sp.discount_percent AS discountPercent,
      sp.test_payment AS testPayment,

      sp.character_limit AS purchasedCharacters,

      u.character_limit AS totalCharacters,
      u.characters_used AS charactersUsed,

      GREATEST(
        u.character_limit - u.characters_used,
        0
      ) AS balanceCharacters,

      sp.razorpay_order_id AS orderId,
      sp.razorpay_payment_id AS paymentId,

      sp.amount AS amount,
      sp.amount AS amountPaidPaise,
      sp.currency,
      sp.payment_status AS status,
      sp.payment_method AS method,
      sp.payment_type AS paymentType,
      sp.paid_at AS paidAt

    FROM signup_payments sp

    INNER JOIN users u
      ON u.id = sp.owner_id

    ORDER BY sp.paid_at DESC
  `;

    db.query(sql, callback);
  }
};

module.exports = PaymentModel;