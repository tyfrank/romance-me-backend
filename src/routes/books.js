const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const monetizationController = require('../controllers/monetizationController');
const chapterAccessController = require('../controllers/chapterAccessController');
const { requireAuth, requireAge18 } = require('../middleware/auth');

// Monetization routes - allow unauthenticated access for access checks
// This must come BEFORE the general auth middleware
router.get('/:bookId/chapters/:chapterNumber/access', chapterAccessController.checkChapterAccess);

// All other book routes require authentication
router.use(requireAuth);

// Browsing routes - no age verification needed
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);

// Content access routes - require age verification
router.get('/:bookId/chapters/:chapterNumber', requireAge18, bookController.getChapter);
router.post('/:bookId/chapters/:chapterNumber/comment', requireAge18, bookController.saveChapterComment);

// Monetization routes that require auth
router.post('/:bookId/chapters/:chapterNumber/unlock', requireAge18, chapterAccessController.unlockChapterWithCoins);

// Keep existing endpoints for backward compatibility
router.get('/:bookId/unlocked-chapters', requireAge18, monetizationController.getUserUnlockedChapters);

module.exports = router;