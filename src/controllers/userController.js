const db = require('../config/database');

const getProfile = async (req, res) => {
  try {
    const profileResult = await db.query(
      `SELECT 
        u.id, u.email, u.birth_date,
        p.first_name, p.last_name, p.display_name,
        p.hair_color, p.hair_length, p.hair_type,
        p.eye_color, p.height, p.build, p.skin_tone,
        p.style_preference, p.favorite_setting,
        p.profile_completed, p.preferences,
        p.created_at
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const profile = profileResult.rows[0];

    res.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        displayName: profile.display_name,
        hairColor: profile.hair_color,
        hairLength: profile.hair_length,
        hairType: profile.hair_type,
        eyeColor: profile.eye_color,
        height: profile.height,
        build: profile.build,
        skinTone: profile.skin_tone,
        stylePreference: profile.style_preference,
        favoriteSetting: profile.favorite_setting,
        profileCompleted: profile.profile_completed,
        preferences: profile.preferences,
        createdAt: profile.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

const updateProfile = async (req, res) => {
  console.log('Update profile request received');
  console.log('User ID:', req.user?.id);
  console.log('Request body:', req.body);
  
  const {
    firstName,
    lastName,
    hairColor,
    hairLength,
    hairType,
    eyeColor,
    height,
    build,
    skinTone,
    stylePreference,
    favoriteSetting,
    profileCompleted,
    preferences
  } = req.body;

  try {
    // Build update query dynamically based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (firstName !== undefined) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(lastName);
    }
    if (hairColor !== undefined) {
      updateFields.push(`hair_color = $${paramCount++}`);
      values.push(hairColor);
    }
    if (hairLength !== undefined) {
      updateFields.push(`hair_length = $${paramCount++}`);
      values.push(hairLength);
    }
    if (hairType !== undefined) {
      updateFields.push(`hair_type = $${paramCount++}`);
      values.push(hairType);
    }
    if (eyeColor !== undefined) {
      updateFields.push(`eye_color = $${paramCount++}`);
      values.push(eyeColor);
    }
    if (height !== undefined) {
      updateFields.push(`height = $${paramCount++}`);
      values.push(height);
    }
    if (build !== undefined) {
      updateFields.push(`build = $${paramCount++}`);
      values.push(build);
    }
    if (skinTone !== undefined) {
      updateFields.push(`skin_tone = $${paramCount++}`);
      values.push(skinTone);
    }
    if (stylePreference !== undefined) {
      updateFields.push(`style_preference = $${paramCount++}`);
      values.push(stylePreference);
    }
    if (favoriteSetting !== undefined) {
      updateFields.push(`favorite_setting = $${paramCount++}`);
      values.push(favoriteSetting);
    }
    if (profileCompleted !== undefined) {
      updateFields.push(`profile_completed = $${paramCount++}`);
      values.push(profileCompleted);
    }
    if (preferences !== undefined) {
      updateFields.push(`preferences = $${paramCount++}`);
      values.push(JSON.stringify(preferences));
    }

    // Always update the updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add user_id for WHERE clause
    values.push(req.user.id);

    const query = `
      UPDATE user_profiles 
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    const updatedProfile = result.rows[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        firstName: updatedProfile.first_name,
        lastName: updatedProfile.last_name,
        hairColor: updatedProfile.hair_color,
        hairLength: updatedProfile.hair_length,
        hairType: updatedProfile.hair_type,
        eyeColor: updatedProfile.eye_color,
        height: updatedProfile.height,
        build: updatedProfile.build,
        skinTone: updatedProfile.skin_tone,
        stylePreference: updatedProfile.style_preference,
        favoriteSetting: updatedProfile.favorite_setting,
        profileCompleted: updatedProfile.profile_completed,
        preferences: updatedProfile.preferences
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

const getCurrentReading = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        rp.book_id,
        rp.current_chapter_number,
        rp.progress_percentage,
        rp.last_read_at,
        b.title,
        b.author,
        b.cover_image_url as cover_image,
        b.status,
        c.title as chapter_title
       FROM user_reading_progress rp
       JOIN books b ON rp.book_id = b.id
       LEFT JOIN chapters c ON b.id = c.book_id AND c.chapter_number = rp.current_chapter_number
       WHERE rp.user_id = $1 
       AND rp.completed_at IS NULL
       ORDER BY rp.last_read_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        currentReading: null
      });
    }

    const reading = result.rows[0];

    res.json({
      success: true,
      currentReading: {
        bookId: reading.book_id,
        title: reading.title,
        author: reading.author,
        coverImage: reading.cover_image,
        currentChapter: reading.current_chapter_number,
        chapterTitle: reading.chapter_title,
        progressPercentage: reading.progress_percentage,
        lastReadAt: reading.last_read_at,
        status: reading.status
      }
    });

  } catch (error) {
    console.error('Get current reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current reading'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getCurrentReading
};