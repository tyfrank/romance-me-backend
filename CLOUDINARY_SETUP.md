# Cloudinary Setup Guide for RomanceMe

## Why Cloudinary?
Railway doesn't persist uploaded files, so we use Cloudinary to store book covers in the cloud. This makes file uploads work permanently!

## Quick Setup (5 minutes)

### 1. Create Free Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Click "Sign Up for Free"
3. Fill in your details
4. Verify your email

### 2. Get Your Credentials
1. After logging in, go to your Dashboard
2. You'll see your credentials:
   - Cloud Name: `your-cloud-name`
   - API Key: `123456789012345`
   - API Secret: `your-secret-key-here`

### 3. Add to Railway Environment Variables
1. Go to your Railway project
2. Click on your backend service
3. Go to "Variables" tab
4. Add these environment variables:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 4. Deploy Changes
The backend code is already set up to use Cloudinary! Just:
1. Push the backend changes to GitHub
2. Railway will auto-deploy
3. File uploads will now work!

## How It Works
1. User uploads image from computer
2. Image goes directly to Cloudinary
3. Cloudinary returns permanent URL
4. URL saves in database
5. Image displays forever!

## Testing
After setup, test by:
1. Go to Admin → Edit Book
2. Choose "Upload Image File From Computer"
3. Select any image
4. Click "Update Book"
5. Check your discover page - the image should appear!

## Free Tier Limits
- 25 GB storage
- 25 GB bandwidth/month
- More than enough for thousands of book covers!

## Troubleshooting
If uploads aren't working:
1. Check Railway logs for errors
2. Verify environment variables are set correctly
3. Make sure credentials are copied exactly (no extra spaces)

## Already Working!
The code is already integrated and ready to go. You just need to:
1. Sign up for Cloudinary (free)
2. Add the environment variables to Railway
3. Deploy!