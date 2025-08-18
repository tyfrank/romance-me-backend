const { Client } = require('pg');
require('dotenv').config();

const migrateDatabase = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'story_reader_db'
  });

  try {
    await client.connect();
    console.log('Running database migration for enhanced profiles...');
    
    // Add new columns to user_profiles table
    await client.query(`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(50),
      ADD COLUMN IF NOT EXISTS hair_color VARCHAR(20),
      ADD COLUMN IF NOT EXISTS hair_length VARCHAR(20),
      ADD COLUMN IF NOT EXISTS hair_type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS eye_color VARCHAR(20),
      ADD COLUMN IF NOT EXISTS height VARCHAR(20),
      ADD COLUMN IF NOT EXISTS build VARCHAR(20),
      ADD COLUMN IF NOT EXISTS skin_tone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS style_preference VARCHAR(20),
      ADD COLUMN IF NOT EXISTS favorite_setting VARCHAR(20),
      ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false
    `);
    
    // Migrate existing display_name data to first_name
    await client.query(`
      UPDATE user_profiles 
      SET first_name = display_name 
      WHERE first_name IS NULL AND display_name IS NOT NULL
    `);
    
    console.log('Database migration completed successfully');
    
  } catch (error) {
    console.error('Error running database migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

migrateDatabase();