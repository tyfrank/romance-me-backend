const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { hashToken } = require('../middleware/auth');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  const { email, password, birthDate, firstName, lastName } = req.body;
  
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Ensure core tables exist
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        birth_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        display_name VARCHAR(100),
        hair_color VARCHAR(50),
        hair_length VARCHAR(50),
        hair_type VARCHAR(50),
        eye_color VARCHAR(50),
        height VARCHAR(20),
        build VARCHAR(50),
        skin_tone VARCHAR(50),
        style_preference VARCHAR(100),
        favorite_setting VARCHAR(100),
        profile_completed BOOLEAN DEFAULT false,
        preferences JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(
      password, 
      parseInt(process.env.BCRYPT_ROUNDS || 10)
    );
    
    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, birth_date) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, birth_date`,
      [email, passwordHash, birthDate]
    );
    
    const userId = userResult.rows[0].id;
    
    // Create user profile
    await client.query(
      `INSERT INTO user_profiles (user_id, first_name, last_name, display_name) 
       VALUES ($1, $2, $3, $4)`,
      [userId, firstName, lastName, firstName]
    );
    
    // Generate JWT token
    const token = generateToken(userId);
    const tokenHash = hashToken(token);
    
    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    await client.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        email,
        firstName,
        lastName
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Get user with profile
    const userResult = await db.query(
      `SELECT u.id, u.email, u.password_hash, u.birth_date, p.first_name, p.last_name, p.display_name, p.profile_completed
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.email = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate new token
    const token = generateToken(user.id);
    const tokenHash = hashToken(token);
    
    // Create new session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await db.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, tokenHash, expiresAt]
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profileCompleted: user.profile_completed || false
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: true });
    }
    
    const token = authHeader.substring(7);
    const tokenHash = hashToken(token);
    
    // Delete the session
    await db.query(
      'DELETE FROM user_sessions WHERE token_hash = $1',
      [tokenHash]
    );
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

const verify = async (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      displayName: req.user.displayName,
      profileCompleted: req.user.profileCompleted
    }
  });
};

module.exports = {
  register,
  login,
  logout,
  verify
};