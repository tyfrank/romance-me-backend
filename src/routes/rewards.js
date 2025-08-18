const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewardsController');
const { requireAuth } = require('../middleware/auth');

// All rewards routes require authentication
router.use(requireAuth);

router.get('/', rewardsController.getRewardsStatus);
router.get('/status', rewardsController.getRewardsStatus);
router.post('/check-in', rewardsController.dailyCheckIn);

module.exports = router;