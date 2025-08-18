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

const requireAge18 = (req, res, next) => {
  if (!req.user || !req.user.birthDate) {
    return res.status(403).json({ 
      success: false, 
      message: 'Age verification required' 
    });
  }
  
  const birthDate = new Date(req.user.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 18) {
    return res.status(403).json({ 
      success: false, 
      message: 'Must be 18 or older to access this content' 
    });
  }
  
  next();
};

module.exports = {
  requireAuth,
  requireAge18,
  hashToken
};