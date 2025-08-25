const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const monetizationController = require('../controllers/monetizationController');
const { requireAuth, requireAge18 } = require('../middleware/auth');

// Try to import new controller, fallback to old one
let chapterAccessController;
try {
  chapterAccessController = require('../controllers/chapterAccessController');
} catch (error) {
  console.log('Using fallback monetization controller');
  chapterAccessController = monetizationController;
}

// All book routes require authentication
router.use(requireAuth);

// Browsing routes - no age verification needed
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);

// Content access routes - require age verification
router.get('/:bookId/chapters/:chapterNumber', requireAge18, bookController.getChapter);
router.post('/:bookId/chapters/:chapterNumber/comment', requireAge18, bookController.saveChapterComment);

// Monetization routes (isolated from core book loading)
// Use new enhanced chapter access controller
router.get('/:bookId/chapters/:chapterNumber/access', requireAge18, chapterAccessController.checkChapterAccess);
router.post('/:bookId/chapters/:chapterNumber/unlock', requireAge18, chapterAccessController.unlockChapterWithCoins);

// Keep existing endpoints for backward compatibility
router.get('/:bookId/unlocked-chapters', requireAge18, monetizationController.getUserUnlockedChapters);

module.exports = router;