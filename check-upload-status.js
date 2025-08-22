// Production Railway database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://postgres:postgres@postgresql.railway.internal:5432/railway",
  ssl: { rejectUnauthorized: false }
});
const db = { query: (text, params) => pool.query(text, params) };

(async () => {
  try {
    // Check for ANY activity in last 15 minutes
    const recent = await db.query("SELECT title, total_chapters, created_at, updated_at FROM books WHERE updated_at > NOW() - INTERVAL '15 minutes' OR created_at > NOW() - INTERVAL '15 minutes' ORDER BY GREATEST(created_at, updated_at) DESC");
    
    if (recent.rows.length > 0) {
      console.log('📚 Recent Upload Activity:');
      console.log('========================');
      recent.rows.forEach(b => {
        console.log(`${b.title} - ${b.total_chapters} chapters`);
        console.log(`  Created: ${b.created_at}`);
        console.log(`  Updated: ${b.updated_at}`);
      });
    } else {
      console.log('❌ No recent uploads detected in database');
      console.log('   (Uploads are going to Railway, not local DB)');
    }
    
    // Check current status of all books
    const status = await db.query(`
      SELECT 
        b.title,
        b.total_chapters as display,
        COUNT(c.id) as actual
      FROM books b
      LEFT JOIN chapters c ON b.id = c.book_id
      GROUP BY b.id, b.title, b.total_chapters
      ORDER BY b.title
    `);
    
    console.log('\n📊 Current Book Status (Local DB):');
    console.log('==================================');
    status.rows.forEach(b => {
      const icon = parseInt(b.display) === parseInt(b.actual) ? '✅' : '❌';
      console.log(`${icon} ${b.title}: ${b.actual}/${b.display} chapters`);
    });
    
    console.log('\n⚠️  Note: Your uploads go to Railway DB, not this local DB');
    console.log('   Check Railway logs to see if the batch processing worked');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();