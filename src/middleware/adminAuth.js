const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin authentication required' 
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify it's an admin token
      if (decoded.type !== 'admin') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid admin token' 
        });
      }
      
      // Check if admin session exists and is valid
      const tokenHash = hashToken(token);
      const sessionResult = await db.query(
        `SELECT s.*, a.username, a.email, a.role, a.is_active 
         FROM admin_sessions s
         JOIN admin_users a ON s.admin_id = a.id
         WHERE s.token_hash = $1 AND s.expires_at > NOW() AND a.is_active = true`,
        [tokenHash]
      );
      
      if (sessionResult.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Admin session expired or invalid' 
        });
      }
      
      req.admin = {
        id: decoded.adminId,
        username: sessionResult.rows[0].username,
        email: sessionResult.rows[0].email,
        role: sessionResult.rows[0].role
      };
      
      next();
    } catch (jwtError) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid admin token' 
      });
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Admin authentication error' 
    });
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    });
  }
  next();
};

module.exports = {
  requireAdminAuth,
  requireSuperAdmin,
  hashToken
};