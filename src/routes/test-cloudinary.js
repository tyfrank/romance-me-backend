const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

// Test endpoint to verify Cloudinary configuration
router.get('/cloudinary-status', async (req, res) => {
  try {
    // Check if environment variables are set
    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'NOT_SET',
      api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT_SET',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT_SET'
    };
    
    console.log('🔍 Cloudinary config check:', config);
    
    // Try to ping Cloudinary
    let cloudinaryStatus = 'unknown';
    let errorMessage = null;
    
    try {
      const result = await cloudinary.api.ping();
      cloudinaryStatus = 'connected';
      console.log('✅ Cloudinary ping successful');
    } catch (error) {
      cloudinaryStatus = 'failed';
      errorMessage = error.message;
      console.log('❌ Cloudinary ping failed:', error.message);
    }
    
    res.json({
      success: true,
      config: config,
      cloudinaryStatus: cloudinaryStatus,
      error: errorMessage,
      message: 'Check Railway logs for detailed information'
    });
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;