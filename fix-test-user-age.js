const db = require('./src/config/database');

const fixTestUserAge = async () => {
  try {
    console.log('🔧 Fixing test user birth date for age verification...');
    
    // Update test user to have a valid birth date (25 years old)
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 25); // 25 years ago
    
    const result = await db.query(
      `UPDATE users 
       SET birth_date = $1
       WHERE email = 'test@example.com'
       RETURNING email, birth_date`,
      [birthDate]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Updated test user:');
      console.log('   Email:', result.rows[0].email);
      console.log('   Birth Date:', result.rows[0].birth_date);
      console.log('   Age:', new Date().getFullYear() - birthDate.getFullYear(), 'years');
    } else {
      console.log('❌ Test user not found');
    }
    
  } catch (error) {
    console.error('Error updating test user:', error);
  } finally {
    process.exit(0);
  }
};

fixTestUserAge();