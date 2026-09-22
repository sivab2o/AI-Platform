const PaymentModel =
  require('../models/paymentModel');

const getMyPayments = (req, res) => {
  PaymentModel.getOwnerPayments(
    req.user.id,
    (error, results) => {
      if (error) {
        console.error(
          'Get owner payments error:',
          error
        );

        return res.status(500).json({
          message: 'Unable to load payment details'
        });
      }

      return res.status(200).json({
        payments: results || []
      });
    }
  );
};

const getAllPayments = (req, res) => {
  PaymentModel.getAllPayments(
    (error, results) => {
      if (error) {
        console.error(
          'Get all payments error:',
          error
        );

        return res.status(500).json({
          message: 'Unable to load payments'
        });
      }

      return res.status(200).json({
        payments: results || []
      });
    }
  );
};

module.exports = {
  getMyPayments,
  getAllPayments
};