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

// Enhanced Analytics Routes
const analyticsController = require('../controllers/analyticsController');
router.get('/analytics/engagement', requireAdminAuth, analyticsController.getUserEngagementStats);
router.get('/analytics/content', requireAdminAuth, analyticsController.getContentPerformanceStats);
router.get('/analytics/revenue', requireAdminAuth, analyticsController.getRevenueStats);
router.get('/analytics/technical', requireAdminAuth, analyticsController.getTechnicalStats);
router.get('/analytics/overview', requireAdminAuth, analyticsController.getAnalyticsOverview);

// Book management routes
// Temporarily disable auth for book reads to fix frontend issue
router.get('/books', adminContentController.getAllBooks);
router.get('/books/:id', adminContentController.getBook);
router.post('/books', requireAdminAuth, uploadToCloud.single('coverImage'), adminContentController.createBook);
// Temporarily disable auth for book updates to fix frontend issue
router.put('/books/:id', uploadToCloud.single('coverImage'), (req, res, next) => {
  console.log(`🔄 PUT /books/${req.params.id} - Admin update request received`);
  console.log('📄 Content-Type:', req.headers['content-type']);
  console.log('📁 Has file in request:', !!req.file);
  console.log('🔐 Auth header:', req.headers.authorization);
  next();
}, adminContentController.updateBook);
router.delete('/books/:id', requireAdminAuth, adminContentController.deleteBook);

// Chapter management routes
router.get('/books/:bookId/chapters', requireAdminAuth, adminContentController.getChapters);
router.get('/chapters/:chapterId', requireAdminAuth, adminContentController.getChapterContent);
router.put('/chapters/:chapterId', requireAdminAuth, adminContentController.updateChapter);
router.put('/books/:bookId/chapters/:chapterNumber', requireAdminAuth, adminContentController.updateChapterByNumber);

// Comments management
router.get('/comments', requireAdminAuth, adminContentController.getComments);

module.exports = router;