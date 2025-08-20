require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'drslehnud',
  api_key: '583845916636138',
  api_secret: 'cCFq_hB809QDJi2n1YjysGd-XGg'
});

async function testUpload() {
  try {
    console.log('🧪 Testing direct Cloudinary upload...');
    
    // Test with a sample image URL
    const result = await cloudinary.uploader.upload(
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
      {
        folder: 'romance-me/book-covers',
        public_id: 'test-upload-' + Date.now(),
        transformation: [
          { width: 400, height: 600, crop: 'fill' }
        ]
      }
    );
    
    console.log('✅ Upload successful!');
    console.log('📷 Image URL:', result.secure_url);
    console.log('🆔 Public ID:', result.public_id);
    
    // Clean up - delete the test image
    try {
      await cloudinary.uploader.destroy(result.public_id);
      console.log('🗑️ Test image cleaned up');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup error (not critical):', cleanupError.message);
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    console.error('Error details:', error);
  }
}

testUpload();