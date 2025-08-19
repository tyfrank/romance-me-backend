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
  const { username, password, email } = req.body;
  
  try {
    // Ensure admin tables exist
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB DEFAULT '{}',
        admin_id UUID REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default admin user if none exists
    const adminExists = await db.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminExists.rows[0].count) === 0) {
      const hashedPassword = await bcrypt.hash('SecureAdmin2024!', 10);
      await db.query(`
        INSERT INTO admin_users (username, email, password_hash, role) 
        VALUES ($1, $2, $3, $4)`,
        ['admin', 'admin@romanceme.com', hashedPassword, 'super_admin']
      );
    }
    
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