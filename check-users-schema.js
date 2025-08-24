const db = require('./src/config/database');

const checkUsersSchema = async () => {
  try {
    console.log('🔍 Checking users table schema...');
    
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Also check current test user data
    const userResult = await db.query(
      `SELECT id, email, birth_date, created_at 
       FROM users 
       WHERE email = 'test@example.com'`
    );
    
    if (userResult.rows.length > 0) {
      console.log('\nTest user data:');
      console.log(userResult.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
};

checkUsersSchema();