const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewardsController');
const { requireAuth } = require('../middleware/auth');

// Optional authentication middleware for rewards status
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth - continue without user
      req.user = null;
      return next();
    }
    
    // Try to authenticate but don't fail if it doesn't work
    await requireAuth(req, res, next);
  } catch (error) {
    // Auth failed - continue without user
    req.user = null;
    next();
  }
};

// Use optional auth for status endpoints
router.get('/', optionalAuth, rewardsController.getRewardsStatus);
router.get('/status', optionalAuth, rewardsController.getRewardsStatus);

// Check-in requires authentication
router.post('/check-in', optionalAuth, rewardsController.dailyCheckIn);

module.exports = router;