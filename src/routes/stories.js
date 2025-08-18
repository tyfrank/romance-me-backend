const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { requireAuth, requireAge18 } = require('../middleware/auth');

// All story routes require authentication and age verification
router.use(requireAuth);
router.use(requireAge18);

router.get('/', storyController.getStories);
router.get('/:id', storyController.getStoryById);

module.exports = router;