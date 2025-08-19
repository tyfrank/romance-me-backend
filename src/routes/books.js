const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const monetizationController = require('../controllers/monetizationController');
const { requireAuth, requireAge18 } = require('../middleware/auth');

// All book routes require authentication
router.use(requireAuth);

// Browsing routes - no age verification needed
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);

// Content access routes - require age verification
router.get('/:bookId/chapters/:chapterNumber', requireAge18, bookController.getChapter);
router.post('/:bookId/chapters/:chapterNumber/comment', requireAge18, bookController.saveChapterComment);

// Monetization routes - require age verification
router.get('/:bookId/chapters/:chapterNumber/access', requireAge18, monetizationController.checkChapterAccess);
router.post('/:bookId/chapters/:chapterNumber/unlock', requireAge18, monetizationController.unlockChapter);
router.get('/:bookId/unlocked-chapters', requireAge18, monetizationController.getUserUnlockedChapters);

module.exports = router;