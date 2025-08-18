const { Client } = require('pg');
require('dotenv').config();

const setupDatabase = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'story_reader_db';
    const checkDbExists = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (checkDbExists.rows.length === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created successfully`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }
    
    await client.end();
    
    // Connect to the new database and create tables
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName
    });
    
    await dbClient.connect();
    
    // Enable UUID extension
    await dbClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    
    // Create users table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        birth_date DATE NOT NULL,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_profiles table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        display_name VARCHAR(100) NOT NULL,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create stories table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content JSONB NOT NULL,
        tags VARCHAR(50)[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create user_sessions table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await dbClient.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await dbClient.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash)`);
    await dbClient.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON user_sessions(expires_at)`);
    await dbClient.query(`CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(is_active)`);
    
    console.log('All tables created successfully');
    
    await dbClient.end();
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
};

setupDatabase();