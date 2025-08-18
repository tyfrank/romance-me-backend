const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const monetizationController = require('../controllers/monetizationController');
const { requireAuth, requireAge18 } = require('../middleware/auth');

// All book routes require authentication and age verification
router.use(requireAuth);
router.use(requireAge18);

router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);
router.get('/:bookId/chapters/:chapterNumber', bookController.getChapter);
router.post('/:bookId/chapters/:chapterNumber/comment', bookController.saveChapterComment);

// Monetization routes
router.get('/:bookId/chapters/:chapterNumber/access', monetizationController.checkChapterAccess);
router.post('/:bookId/chapters/:chapterNumber/unlock', monetizationController.unlockChapter);
router.get('/:bookId/unlocked-chapters', monetizationController.getUserUnlockedChapters);

module.exports = router;