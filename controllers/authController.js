// controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const PaymentModel = require('../models/paymentModel');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
// const { log } = require('node:console');

const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const SIGNUP_PLANS = {
  trial: {
    code: 'trial',
    name: 'Trial Pack',
    originalPrice: 499,
    price: 499,
    discountPercent: 0,
    testPrice: 1,
    amount: 100,
    characterLimit: 99800,
    validityDays: 15
  },

  silver: {
    code: 'silver',
    name: 'Silver',
    originalPrice: 3000,
    price: 2850,
    discountPercent: 5,
    testPrice: 2,
    amount: 200,
    characterLimit: 570000,
    validityDays: 90
  },

  gold: {
    code: 'gold',
    name: 'Gold',
    originalPrice: 6000,
    price: 5400,
    discountPercent: 10,
    testPrice: 3,
    amount: 300,
    characterLimit: 1080000,
    validityDays: 180
  },

  platinum: {
    code: 'platinum',
    name: 'Platinum',
    originalPrice: 12000,
    price: 10200,
    discountPercent: 15,
    testPrice: 4,
    amount: 400,
    characterLimit: 2040000,
    validityDays: 365
  }
};

const createSignupOrder = (req, res) => {

  const {
    name,
    email,
    mobile,
    password,
    planCode
  } = req.body;

  const selectedPlan =
    SIGNUP_PLANS[String(planCode || '').toLowerCase()];

  if (!name || !email || !mobile || !password || !selectedPlan) {
    return res.status(400).json({
      message: 'All signup fields are required'
    });
  }

  const cleanEmail = String(email)
    .trim()
    .toLowerCase();

  const cleanMobile = String(mobile)
    .replace(/\D/g, '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({
      message: 'Please enter a valid email address'
    });
  }

  if (cleanMobile.length !== 10) {
    return res.status(400).json({
      message: 'Please enter a valid 10-digit mobile number'
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      message: 'Password must contain at least 6 characters'
    });
  }

  User.findByEmail(cleanEmail, async (error, results) => {
    if (error) {
      return res.status(500).json({
        message: 'Unable to check email'
      });
    }

    if (results.length > 0) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    try {
      const order = await razorpay.orders.create({
        amount: selectedPlan.amount,
        currency: 'INR',
        receipt: `signup_${Date.now()}`,
        notes: {
          payment_type: 'signup',
          signup_email: cleanEmail,
          signup_mobile: cleanMobile,
          plan_code: selectedPlan.code,

          plan_name: selectedPlan.name,

          original_price:
            String(selectedPlan.originalPrice),

          actual_plan_price:
            String(selectedPlan.price),

          test_payment:
            String(selectedPlan.testPrice),

          discount_percent:
            String(selectedPlan.discountPercent),

          character_limit:
            String(selectedPlan.characterLimit)
        }
      });

      return res.status(200).json({
        message: 'Payment order created',
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
        plan: selectedPlan
      });

    } catch (paymentError) {
      console.error(
        'Razorpay order error:',
        paymentError
      );

      return res.status(500).json({
        message: 'Unable to initiate signup payment'
      });
    }
  });
};


const verifySignupPayment = async (req, res) => {
  const {
    name,
    email,
    mobile,
    password,
    planCode,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const selectedPlan =
    SIGNUP_PLANS[String(planCode || '').toLowerCase()];

  if (
    !name ||
    !email ||
    !mobile ||
    !password ||
    !selectedPlan ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    return res.status(400).json({
      message: 'Signup and payment details are required'
    });
  }

  const cleanEmail = String(email)
    .trim()
    .toLowerCase();

  const cleanMobile = String(mobile)
    .replace(/\D/g, '');

  try {
    const signatureBody =
      `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac(
        'sha256',
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(signatureBody)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: 'Payment verification failed'
      });
    }

    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id)
    ]);

    if (
      payment.order_id !== razorpay_order_id ||
      Number(order.amount) !== selectedPlan.amount ||
      Number(payment.amount) !== selectedPlan.amount ||
      order.currency !== 'INR' ||
      payment.currency !== 'INR' ||
      !['captured', 'authorized'].includes(payment.status)
    ) {
      return res.status(400).json({
        message: 'Payment is not valid for signup'
      });
    }

    if (
      order.notes?.signup_email !== cleanEmail ||
      order.notes?.signup_mobile !== cleanMobile ||
      order.notes?.payment_type !== 'signup' ||
      order.notes?.plan_code !== selectedPlan.code ||
      Number(order.notes?.actual_plan_price) !==
      selectedPlan.price ||
      Number(order.notes?.character_limit) !==
      selectedPlan.characterLimit
    ) {
      return res.status(400).json({
        message: 'Signup details do not match the payment order'
      });
    }

    User.findByEmail(cleanEmail, (error, results) => {
      if (error) {
        return res.status(500).json({
          message: 'Unable to check email'
        });
      }

      if (results.length > 0) {
        return res.status(400).json({
          message: 'Email already exists'
        });
      }

      User.createUser(
        String(name).trim(),
        cleanEmail,
        cleanMobile,
        password,
        selectedPlan.code,
        selectedPlan.characterLimit,
        (createError, createdUser) => {
          if (createError) {
            console.error(
              'User creation error:',
              createError
            );

            return res.status(500).json({
              message:
                'Payment succeeded, but account creation failed. Please contact support.'
            });
          }

          const paidAt = payment.created_at
            ? new Date(payment.created_at * 1000)
            : new Date();

          PaymentModel.saveSignupPayment(
            {
              ownerId: createdUser.id,
              ownerUserId: createdUser.user_id,

              planCode: selectedPlan.code,
              planName: selectedPlan.name,

              originalPrice:
                selectedPlan.originalPrice,

              actualPlanPrice:
                selectedPlan.price,

              discountPercent:
                selectedPlan.discountPercent,

              testPayment:
                selectedPlan.testPrice,

              characterLimit:
                selectedPlan.characterLimit,

              validityDays:
                selectedPlan.validityDays,

              orderId: razorpay_order_id,
              paymentId: razorpay_payment_id,
              amount: Number(payment.amount),
              paymentType: 'signup',
              currency: payment.currency,
              status: payment.status,
              method: payment.method || null,
              paidAt
            },
            (paymentSaveError) => {
              if (paymentSaveError) {
                console.error(
                  'Save payment error:',
                  paymentSaveError
                );

                return res.status(500).json({
                  message:
                    'Account created, but payment details could not be saved. Please contact support.'
                });
              }

              return res.status(201).json({
                message:
                  'Payment verified and account created successfully'
              });
            }
          );
        }
      );
    });

  } catch (error) {
    console.error(
      'Razorpay verification error:',
      error
    );

    return res.status(500).json({
      message: 'Unable to verify signup payment'
    });
  }
};

// Controller for user registration (signup)
const signup = (req, res) => {


  const { name, email, mobile, password } = req.body;



  // Check if user already exists
  User.findByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error checking email' });

    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    User.createUser(
      name,
      email,
      mobile,
      password,
      null,
      0,
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Error creating user' });

        res.status(201).json({
          message: 'User created successfully'
        });
      }
    );
  });
};

// Controller for user login
const login = (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  User.findByEmail(email, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error fetching user' });

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    bcrypt.compare(password, results[0].password, (err, match) => {
      if (err) {
        return res.status(500).json({
          message: 'Unable to verify login'
        });
      }

      if (!match) {
        return res.status(401).json({
          message: 'Invalid email or password'
        });
      }

      const user = results[0];

      if (user.status === 'inactive') {
        return res.status(403).json({
          message: 'Your account has been deactivated. Please contact the administrator.'
        });
      }

      const token = generateToken(user.id);

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          lang: user.lang,
          role: user.role || 'owner',
          status: user.status || 'active',
          current_plan:
            user.current_plan || null
        }
      });
    });
  });
};

const forgotPassword = (req, res) => {
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase();

  if (!email) {
    return res.status(400).json({
      message: 'Email is required'
    });
  }

  User.findByEmail(email, async (err, results) => {
    if (err) {
      return res.status(500).json({
        message: 'Unable to process password reset'
      });
    }

    /*
     * Return the same response even when the email does not exist.
     * This prevents exposing registered email addresses.
     */
    if (results.length === 0) {
      return res.status(200).json({
        message:
          'If this email is registered, a verification code has been sent.'
      });
    }

    try {
      const otp = crypto.randomInt(100000, 1000000).toString();

      const otpHash = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

      const expiresAt =
        new Date(Date.now() + 10 * 60 * 1000);

      User.saveResetOtp(
        email,
        otpHash,
        expiresAt,
        async saveError => {
          if (saveError) {
            console.error(
              'Save reset OTP error:',
              saveError
            );

            return res.status(500).json({
              message:
                'Unable to create verification code'
            });
          }

          try {
                       const transporter =
              nodemailer.createTransport({
                service: 'gmail',

                auth: {
                  user: process.env.SMTP_EMAIL,
                  pass: process.env.SMTP_APP_PASSWORD
                },

                /*
                 * Allow a self-signed certificate only during
                 * local development.
                 *
                 * Production continues to require a valid
                 * trusted certificate.
                 */
                tls: {
                  rejectUnauthorized:
                    process.env.NODE_ENV === 'production'
                }
              });

            await transporter.sendMail({
              from:
                `"Leads Factory Technologies" <${process.env.SMTP_EMAIL}>`,
              to: email,
              subject: 'Password Reset Verification Code',
              html: `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
                  <h2>Password Reset Verification</h2>

                  <p>
                    Use the following verification code to reset your password:
                  </p>

                  <div style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:24px 0">
                    ${otp}
                  </div>

                  <p>
                    This verification code is valid for 10 minutes.
                  </p>

                  <p>
                    If you did not request a password reset, ignore this email.
                  </p>
                </div>
              `
            });

            return res.status(200).json({
              message:
                'If this email is registered, a verification code has been sent.'
            });

          } catch (emailError) {
            console.error(
              'Reset OTP email error:',
              emailError.message
            );

            return res.status(500).json({
              message:
                'Verification email could not be sent'
            });
          }
        }
      );

    } catch (otpError) {
      console.error(
        'OTP generation error:',
        otpError
      );

      return res.status(500).json({
        message:
          'Unable to generate verification code'
      });
    }
  });
};


const resetPassword = (req, res) => {
  const email = String(req.body.email || '')
    .trim()
    .toLowerCase();

  const otp = String(req.body.otp || '').trim();

  const newPassword =
    String(req.body.newPassword || '');

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      message:
        'Email, verification code and new password are required'
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      message:
        'Enter a valid 6-digit verification code'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      message:
        'Password must contain at least 8 characters'
    });
  }

  User.findValidResetOtp(
    email,
    (findError, results) => {
      if (findError) {
        return res.status(500).json({
          message:
            'Unable to verify the code'
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          message:
            'Verification code is invalid or expired'
        });
      }

      const submittedOtpHash = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

      const storedOtpHash =
        results[0].reset_otp_hash;

      const submittedBuffer =
        Buffer.from(submittedOtpHash, 'hex');

      const storedBuffer =
        Buffer.from(storedOtpHash, 'hex');

      const otpMatches =
        submittedBuffer.length === storedBuffer.length &&
        crypto.timingSafeEqual(
          submittedBuffer,
          storedBuffer
        );

      if (!otpMatches) {
        return res.status(400).json({
          message:
            'Verification code is invalid or expired'
        });
      }

      User.updatePassword(
        email,
        newPassword,
        updateError => {
          if (updateError) {
            console.error(
              'Password update error:',
              updateError
            );

            return res.status(500).json({
              message:
                'Password could not be updated'
            });
          }

          return res.status(200).json({
            message:
              'Password updated successfully. You can now log in.'
          });
        }
      );
    }
  );
};


module.exports = {
  signup,
  createSignupOrder,
  verifySignupPayment,
  login,
  forgotPassword,
  resetPassword
};