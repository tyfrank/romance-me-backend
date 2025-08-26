const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const monetizationController = require('../controllers/monetizationController');
const chapterAccessController = require('../controllers/chapterAccessController');
const { requireAuth, requireAge18 } = require('../middleware/auth');

// All routes are now open - no authentication required
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);
router.get('/:bookId/chapters/:chapterNumber', bookController.getChapter);
router.post('/:bookId/chapters/:chapterNumber/comment', bookController.saveChapterComment);

// Keep existing endpoints for backward compatibility
router.get('/:bookId/unlocked-chapters', requireAge18, monetizationController.getUserUnlockedChapters);

module.exports = router;