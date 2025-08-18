const db = require('../config/database');

const personalizeContent = (content, userData) => {
  let personalizedText = JSON.stringify(content);
  
  // Helper functions for natural descriptions
  const getNaturalHairLength = (length) => {
    const descriptions = {
      'short': 'cropped',
      'medium': 'shoulder-length',
      'long': 'flowing',
      'very long': 'cascading'
    };
    return descriptions[length?.toLowerCase()] || 'shoulder-length';
  };

  const getNaturalSkinTone = (tone) => {
    const descriptions = {
      'fair': 'porcelain',
      'light': 'fair',
      'medium': 'warm',
      'olive': 'golden',
      'dark': 'rich',
      'deep': 'deep ebony'
    };
    return descriptions[tone?.toLowerCase()] || 'warm';
  };

  const getNaturalBuild = (build) => {
    const descriptions = {
      'slim': 'slender',
      'athletic': 'toned',
      'curvy': 'curvaceous',
      'fuller figure': 'voluptuous',
      'muscular': 'strong'
    };
    return descriptions[build?.toLowerCase()] || 'graceful';
  };

  const getNaturalHeight = (height) => {
    const descriptions = {
      'petite (under 5\'4")': 'petite',
      'average (5\'4"-5\'7")': 'average height',
      'tall (over 5\'7")': 'statuesque'
    };
    return descriptions[height] || 'average height';
  };

  // Replace personalization tokens with user data
  personalizedText = personalizedText.replace(/\{\{firstName\}\}/g, userData.firstName || 'Reader');
  personalizedText = personalizedText.replace(/\{\{name\}\}/g, userData.firstName || 'Reader');
  personalizedText = personalizedText.replace(/\{\{lastName\}\}/g, userData.lastName || '');
  personalizedText = personalizedText.replace(/\{\{fullName\}\}/g, 
    `${userData.firstName || 'Reader'} ${userData.lastName || ''}`.trim());
  
  // Enhanced physical appearance tokens with natural language
  personalizedText = personalizedText.replace(/\{\{hairColor\}\}/g, userData.hairColor?.toLowerCase() || 'brown');
  personalizedText = personalizedText.replace(/\{\{hairLength\}\}/g, getNaturalHairLength(userData.hairLength));
  personalizedText = personalizedText.replace(/\{\{hairType\}\}/g, userData.hairType?.toLowerCase() || 'wavy');
  personalizedText = personalizedText.replace(/\{\{eyeColor\}\}/g, userData.eyeColor?.toLowerCase() || 'brown');
  personalizedText = personalizedText.replace(/\{\{height\}\}/g, getNaturalHeight(userData.height));
  personalizedText = personalizedText.replace(/\{\{build\}\}/g, getNaturalBuild(userData.build));
  personalizedText = personalizedText.replace(/\{\{skinTone\}\}/g, getNaturalSkinTone(userData.skinTone));
  
  // Style and preference tokens
  personalizedText = personalizedText.replace(/\{\{style\}\}/g, userData.stylePreference?.toLowerCase() || 'casual');
  personalizedText = personalizedText.replace(/\{\{setting\}\}/g, userData.favoriteSetting?.toLowerCase() || 'city');
  
  // Enhanced combined description tokens for richer narrative
  const naturalHairLength = getNaturalHairLength(userData.hairLength);
  const hairType = userData.hairType?.toLowerCase() || 'wavy';
  const hairColor = userData.hairColor?.toLowerCase() || 'brown';
  
  // Create more natural hair descriptions
  let hairDescription;
  if (naturalHairLength === 'cropped') {
    hairDescription = `${naturalHairLength} ${hairColor} hair`;
  } else if (naturalHairLength === 'flowing' || naturalHairLength === 'cascading') {
    hairDescription = `${naturalHairLength} ${hairType} ${hairColor} hair`;
  } else {
    hairDescription = `${naturalHairLength} ${hairType} ${hairColor} hair`;
  }
  
  personalizedText = personalizedText.replace(/\{\{hairDescription\}\}/g, hairDescription);
  
  // Additional natural skin descriptions
  const skinDescription = `${getNaturalSkinTone(userData.skinTone)} skin`;
  personalizedText = personalizedText.replace(/\{\{skinDescription\}\}/g, skinDescription);
  
  // Natural build descriptions  
  const buildDescription = `${getNaturalBuild(userData.build)} frame`;
  personalizedText = personalizedText.replace(/\{\{buildDescription\}\}/g, buildDescription);
  
  return JSON.parse(personalizedText);
};

const getStories = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  
  try {
    // Get active stories
    const storiesResult = await db.query(
      `SELECT id, title, description, tags 
       FROM stories 
       WHERE is_active = true 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM stories WHERE is_active = true'
    );
    
    res.json({
      success: true,
      stories: storiesResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stories'
    });
  }
};

const getStoryById = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get story
    const storyResult = await db.query(
      `SELECT id, title, description, content, tags 
       FROM stories 
       WHERE id = $1 AND is_active = true`,
      [id]
    );
    
    if (storyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }
    
    // Get full user profile data for personalization
    const userProfileResult = await db.query(
      `SELECT p.first_name, p.last_name, p.hair_color, p.hair_length, p.hair_type,
              p.eye_color, p.height, p.build, p.skin_tone, p.style_preference, p.favorite_setting
       FROM user_profiles p
       WHERE p.user_id = $1`,
      [req.user.id]
    );
    
    const userProfile = userProfileResult.rows[0] || {};
    const story = storyResult.rows[0];
    
    // Personalize content with full user profile data
    const personalizedContent = personalizeContent(story.content, {
      firstName: userProfile.first_name,
      lastName: userProfile.last_name,
      hairColor: userProfile.hair_color,
      hairLength: userProfile.hair_length,
      hairType: userProfile.hair_type,
      eyeColor: userProfile.eye_color,
      height: userProfile.height,
      build: userProfile.build,
      skinTone: userProfile.skin_tone,
      stylePreference: userProfile.style_preference,
      favoriteSetting: userProfile.favorite_setting
    });
    
    res.json({
      success: true,
      story: {
        id: story.id,
        title: story.title,
        description: story.description,
        tags: story.tags,
        content: personalizedContent
      }
    });
    
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch story'
    });
  }
};

module.exports = {
  getStories,
  getStoryById
};