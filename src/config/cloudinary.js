const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
// You'll need to sign up for a free account at cloudinary.com
// Then add these to your Railway environment variables
console.log('🔧 Configuring Cloudinary with:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY ? `${process.env.CLOUDINARY_API_KEY.substring(0, 4)}***` : 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set (hidden)' : 'demo'
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo', // Using 'demo' for testing
  api_key: process.env.CLOUDINARY_API_KEY || '874837483274837', // Demo key
  api_secret: process.env.CLOUDINARY_API_SECRET || 'a676b67565c6767a6767d6767f676fe1' // Demo secret
});

// Create storage engine for book covers
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'romance-me/book-covers', // Organize uploads in folders
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 600, crop: 'fill' }, // Resize to book cover dimensions
      { quality: 'auto' }, // Automatic quality optimization
      { fetch_format: 'auto' } // Automatic format selection (webp for modern browsers)
    ],
    public_id: (req, file) => {
      // Generate a unique filename
      const bookId = req.params.id || 'new';
      const timestamp = Date.now();
      return `book-${bookId}-${timestamp}`;
    }
  }
});

// Create multer upload middleware
const uploadToCloud = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Function to delete old cover when updating
const deleteOldCover = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary')) {
    return; // Only delete Cloudinary images
  }
  
  try {
    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split('.')[0];
    
    await cloudinary.uploader.destroy(`romance-me/book-covers/${publicId}`);
    console.log('🗑️ Deleted old cover from Cloudinary');
  } catch (error) {
    console.error('Error deleting old cover:', error);
  }
};

module.exports = {
  cloudinary,
  uploadToCloud,
  deleteOldCover
};