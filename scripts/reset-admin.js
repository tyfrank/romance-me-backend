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

async function resetAdmin() {
  const client = await pool.connect();
  
  try {
    // Set admin credentials
    const adminEmail = 'admin@romanceme.com';
    const adminUsername = 'admin';
    const adminPassword = 'Admin123!'; // You can change this
    
    console.log('Resetting admin account...');
    console.log('Email:', adminEmail);
    console.log('Username:', adminUsername);
    console.log('Password:', adminPassword);
    
    // Check if admin exists
    const existingAdmin = await client.query(
      'SELECT id FROM admin_users WHERE email = $1 OR username = $2',
      [adminEmail, adminUsername]
    );
    
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    if (existingAdmin.rows.length > 0) {
      // Update existing admin
      await client.query(
        `UPDATE admin_users 
         SET password_hash = $1, 
             email = $2,
             username = $3,
             updated_at = CURRENT_TIMESTAMP 
         WHERE email = $2 OR username = $3`,
        [passwordHash, adminEmail, adminUsername]
      );
      console.log('\n✅ Admin account updated successfully!');
    } else {
      // Create new admin
      await client.query(
        `INSERT INTO admin_users (username, email, password_hash, role) 
         VALUES ($1, $2, $3, 'admin')`,
        [adminUsername, adminEmail, passwordHash]
      );
      console.log('\n✅ Admin account created successfully!');
    }
    
    console.log('\nAdmin credentials:');
    console.log('Email:', adminEmail);
    console.log('Username:', adminUsername);
    console.log('Password:', adminPassword);
    console.log('\nYou can now login at: https://romance-me-frontend.vercel.app/admin/login');
    console.log('Use either email or username to login.');
    
  } catch (error) {
    console.error('Error resetting admin:', error);
  } finally {
    client.release();
    pool.end();
  }
}

resetAdmin();