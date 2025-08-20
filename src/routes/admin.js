const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const adminContentController = require('../controllers/adminContentController');
const { requireAdminAuth, requireSuperAdmin } = require('../middleware/adminAuth');
const { uploadToCloud } = require('../config/cloudinary');

// Admin authentication routes (no auth required)
router.post('/auth/login', adminAuthController.adminLogin);
router.post('/auth/logout', adminAuthController.adminLogout);
router.get('/auth/verify', requireAdminAuth, adminAuthController.verifyAdmin);

// Dashboard and analytics
router.get('/dashboard/stats', requireAdminAuth, adminContentController.getDashboardStats);

// Book management routes
router.get('/books', requireAdminAuth, adminContentController.getAllBooks);
router.get('/books/:id', requireAdminAuth, adminContentController.getBook);
router.post('/books', requireAdminAuth, uploadToCloud.single('coverImage'), adminContentController.createBook);
router.put('/books/:id', requireAdminAuth, uploadToCloud.single('coverImage'), adminContentController.updateBook);
router.delete('/books/:id', requireAdminAuth, adminContentController.deleteBook);

// Chapter management routes
router.get('/books/:bookId/chapters', requireAdminAuth, adminContentController.getChapters);
router.get('/chapters/:chapterId', requireAdminAuth, adminContentController.getChapterContent);
router.put('/chapters/:chapterId', requireAdminAuth, adminContentController.updateChapter);
router.put('/books/:bookId/chapters/:chapterNumber', requireAdminAuth, adminContentController.updateChapterByNumber);

// Comments management
router.get('/comments', requireAdminAuth, adminContentController.getComments);

module.exports = router;