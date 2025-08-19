const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth, requireAge18 } = require('../middleware/auth');

// All book routes require authentication
router.use(requireAuth);

// Browsing routes - no age verification needed
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);

// Content access routes - require age verification
router.get('/:bookId/chapters/:chapterNumber', requireAge18, bookController.getChapter);
router.post('/:bookId/chapters/:chapterNumber/comment', requireAge18, bookController.saveChapterComment);

module.exports = router;