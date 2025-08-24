const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if session exists and is valid
      const tokenHash = hashToken(token);
      const sessionResult = await db.query(
        `SELECT s.*, u.email, u.birth_date, p.display_name, p.first_name, p.last_name, p.profile_completed 
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [tokenHash]
      );
      
      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Session expired or invalid' 
        });
      }
      
      req.user = {
        id: decoded.userId,
        email: sessionResult.rows[0].email,
        firstName: sessionResult.rows[0].first_name,
        lastName: sessionResult.rows[0].last_name,
        displayName: sessionResult.rows[0].display_name,
        birthDate: sessionResult.rows[0].birth_date,
        profileCompleted: sessionResult.rows[0].profile_completed || false
      };
      
      next();
    } catch (jwtError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

const requireAge18 = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Get user profile with birth date using PostgreSQL
    const userResult = await db.query(
      `SELECT birth_date, created_at 
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    // Check if user has completed age verification
    if (!user.birth_date) {
      return res.status(403).json({
        success: false,
        error: 'Age verification required',
        code: 'AGE_VERIFICATION_REQUIRED',
        message: 'Please complete your profile by adding your birth date',
        action_required: 'SET_BIRTH_DATE'
      });
    }

    // Calculate age
    const birthDate = new Date(user.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Check if user is 18+
    if (age < 18) {
      return res.status(403).json({
        success: false,
        error: 'Content restricted',
        code: 'AGE_RESTRICTED',
        message: 'This content is only available to users 18 and older',
        user_age: age
      });
    }

    // User is verified, continue to content
    console.log(`✅ Age verification passed for user ${userId}: ${age} years old`);
    next();

  } catch (error) {
    console.error('Age verification middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Age verification failed',
      code: 'VERIFICATION_ERROR',
      message: 'Unable to verify age at this time'
    });
  }
};

module.exports = {
  requireAuth,
  requireAge18,
  hashToken
};