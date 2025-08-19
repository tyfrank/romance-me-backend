require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Use DATABASE_URL if available (for Railway), otherwise individual env vars
const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
} : {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'story_reader_db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

const pool = new Pool(poolConfig);

async function createAdmin() {
  const client = await pool.connect();
  
  try {
    // Set admin credentials
    const adminEmail = 'admin@romanceme.com';
    const adminPassword = 'Admin123!'; // You can change this
    
    console.log('Creating admin account...');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
    // Ensure tables exist
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check if admin exists
    const existingAdmin = await client.query(
      'SELECT id FROM admin_users WHERE email = $1',
      [adminEmail]
    );
    
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    if (existingAdmin.rows.length > 0) {
      // Update existing admin password
      await client.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [passwordHash, adminEmail]
      );
      console.log('Admin password updated successfully!');
    } else {
      // Create new admin
      await client.query(
        'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)',
        [adminEmail, passwordHash]
      );
      console.log('Admin account created successfully!');
    }
    
    console.log('\n✅ Admin credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\nYou can now login at: /admin/login');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    client.release();
    pool.end();
  }
}

createAdmin();