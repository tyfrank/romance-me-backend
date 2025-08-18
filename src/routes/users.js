const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// All user routes require authentication
router.use(requireAuth);

router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);
router.get('/current-reading', userController.getCurrentReading);

module.exports = router;