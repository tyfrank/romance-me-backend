const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuthController = require('../controllers/adminAuthController');
const adminContentController = require('../controllers/adminContentController');
const { requireAdminAuth, requireSuperAdmin } = require('../middleware/adminAuth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/covers');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Admin authentication routes (no auth required)
router.post('/auth/login', adminAuthController.adminLogin);
router.post('/auth/logout', adminAuthController.adminLogout);
router.get('/auth/verify', requireAdminAuth, adminAuthController.verifyAdmin);

// Dashboard and analytics
router.get('/dashboard/stats', requireAdminAuth, adminContentController.getDashboardStats);

// Book management routes
router.get('/books', requireAdminAuth, adminContentController.getAllBooks);
router.get('/books/:id', requireAdminAuth, adminContentController.getBook);
router.post('/books', requireAdminAuth, upload.single('coverImage'), adminContentController.createBook);
router.put('/books/:id', requireAdminAuth, upload.single('coverImage'), adminContentController.updateBook);
router.delete('/books/:id', requireAdminAuth, adminContentController.deleteBook);

// Chapter management routes
router.get('/books/:bookId/chapters', requireAdminAuth, adminContentController.getChapters);
router.get('/chapters/:chapterId', requireAdminAuth, adminContentController.getChapterContent);
router.put('/chapters/:chapterId', requireAdminAuth, adminContentController.updateChapter);
router.put('/books/:bookId/chapters/:chapterNumber', requireAdminAuth, adminContentController.updateChapterByNumber);

// Comments management
router.get('/comments', requireAdminAuth, adminContentController.getComments);

module.exports = router;