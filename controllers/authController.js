// controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');
const PaymentModel = require('../models/paymentModel');
// const { log } = require('node:console');

const Razorpay = require('razorpay');
const crypto = require('crypto');

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

module.exports = {
  signup,
  createSignupOrder,
  verifySignupPayment,
  login
};