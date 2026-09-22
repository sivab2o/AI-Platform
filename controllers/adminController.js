const AdminModel = require('../models/adminModel');

const getAdminSummary = (req, res) => {
  AdminModel.getSummary((error, results) => {
    if (error) {
      console.error(
        'Admin summary error:',
        error
      );

      return res.status(500).json({
        message: 'Unable to load admin summary'
      });
    }

    return res.status(200).json(
      results?.[0] || {}
    );
  });
};

const getOwners = (req, res) => {
  AdminModel.getOwners((error, results) => {
    if (error) {
      console.error(
        'Get owners error:',
        error
      );

      return res.status(500).json({
        message: 'Unable to load owners'
      });
    }

    return res.status(200).json({
      owners: results || []
    });
  });
};

const getOwnerDetails = (req, res) => {
  const ownerId = Number(req.params.id);

  if (!Number.isInteger(ownerId)) {
    return res.status(400).json({
      message: 'Invalid owner ID'
    });
  }

  AdminModel.getOwnerById(
    ownerId,
    (error, results) => {
      if (error) {
        console.error(
          'Get owner details error:',
          error
        );

        return res.status(500).json({
          message: 'Unable to load owner details'
        });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({
          message: 'Owner not found'
        });
      }

      return res.status(200).json({
        owner: results[0]
      });
    }
  );
};

const updateOwnerStatus = (req, res) => {
  const ownerId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(ownerId)) {
    return res.status(400).json({
      message: 'Invalid owner ID'
    });
  }

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      message: 'Status must be active or inactive'
    });
  }

  AdminModel.updateOwnerStatus(
    ownerId,
    status,
    (error, result) => {
      if (error) {
        console.error(
          'Update owner status error:',
          error
        );

        return res.status(500).json({
          message: 'Unable to update owner status'
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'Owner not found'
        });
      }

      return res.status(200).json({
        message: `Owner account ${status} successfully`,
        status
      });
    }
  );
};

const updateOwnerChatLimit = (req, res) => {
  const ownerId = Number(req.params.id);

  const chatLimit =
    Number(req.body.chatLimit);

  const resetUsage =
    req.body.resetUsage === true;

  if (!Number.isInteger(ownerId)) {
    return res.status(400).json({
      message: 'Invalid owner ID'
    });
  }

  if (
    !Number.isInteger(chatLimit) ||
    chatLimit < 0
  ) {
    return res.status(400).json({
      message:
        'Chat limit must be zero or a positive whole number'
    });
  }

  AdminModel.updateOwnerChatLimit(
    ownerId,
    chatLimit,
    resetUsage,
    (error, result) => {
      if (error) {
        console.error(
          'Update chat limit error:',
          error
        );

        return res.status(500).json({
          message: 'Unable to update chat limit'
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'Owner not found'
        });
      }

      return res.status(200).json({
        message:
          'Owner chat limit updated successfully',

        chatLimit,
        usageReset: resetUsage
      });
    }
  );
};

module.exports = {
  getAdminSummary,
  getOwners,
  getOwnerDetails,
  updateOwnerStatus,
  updateOwnerChatLimit
};