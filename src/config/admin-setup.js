const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const setupAdminSystem = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'story_reader_db'
  });

  try {
    await client.connect();
    console.log('Setting up admin system...');
    
    // Create admin users table
    await client.query(`
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
    
    // Create admin sessions table
    await client.query(`
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
    
    // Create analytics/usage tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB DEFAULT '{}',
        admin_id UUID REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_analytics_type ON admin_analytics(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_analytics_date ON admin_analytics(created_at)`);
    
    // Create default admin user (change these credentials!)
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    await client.query(`
      INSERT INTO admin_users (username, email, password_hash, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (username) DO NOTHING`,
      ['admin', 'admin@storyreader.com', hashedPassword, 'super_admin']
    );
    
    console.log('Admin system setup complete!');
    console.log('Default admin credentials:');
    console.log('  Username: admin');
    console.log('  Password:', defaultPassword);
    console.log('  ⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY!');
    
  } catch (error) {
    console.error('Error setting up admin system:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

setupAdminSystem();