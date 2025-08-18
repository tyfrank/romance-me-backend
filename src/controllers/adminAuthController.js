const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateAdminToken = (adminId) => {
  return jwt.sign(
    { adminId, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' } // Shorter expiry for admin sessions
  );
};

const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Get admin user
    const adminResult = await db.query(
      `SELECT id, username, email, password_hash, role, is_active 
       FROM admin_users 
       WHERE (username = $1 OR email = $1) AND is_active = true`,
      [username]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const admin = adminResult.rows[0];
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate admin token
    const token = generateAdminToken(admin.id);
    const tokenHash = hashToken(token);
    
    // Create admin session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12);
    
    await db.query(
      `INSERT INTO admin_sessions (admin_id, token_hash, expires_at, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5)`,
      [admin.id, tokenHash, expiresAt, req.ip, req.get('User-Agent')]
    );
    
    // Update last login
    await db.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );
    
    // Log login event
    await db.query(
      `INSERT INTO admin_analytics (event_type, event_data, admin_id) 
       VALUES ($1, $2, $3)`,
      ['admin_login', JSON.stringify({ ip: req.ip, userAgent: req.get('User-Agent') }), admin.id]
    );
    
    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

const adminLogout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: true });
    }
    
    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);
    
    // Delete the admin session
    await db.query(
      'DELETE FROM admin_sessions WHERE token_hash = $1',
      [tokenHash]
    );
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

const verifyAdmin = async (req, res) => {
  res.json({
    valid: true,
    admin: {
      id: req.admin.id,
      username: req.admin.username,
      email: req.admin.email,
      role: req.admin.role
    }
  });
};

module.exports = {
  adminLogin,
  adminLogout,
  verifyAdmin
};