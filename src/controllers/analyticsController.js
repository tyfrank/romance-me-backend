const db = require('../config/database');

// Enhanced User Engagement Analytics
const getUserEngagementStats = async (req, res) => {
  try {
    // Daily, Weekly, Monthly Active Users
    const activeUserStats = await db.query(`
      SELECT 
        -- Daily Active Users (last 24 hours)
        COUNT(DISTINCT CASE WHEN last_read_at > NOW() - INTERVAL '1 day' THEN user_id END) as dau,
        -- Weekly Active Users (last 7 days)
        COUNT(DISTINCT CASE WHEN last_read_at > NOW() - INTERVAL '7 days' THEN user_id END) as wau,
        -- Monthly Active Users (last 30 days)
        COUNT(DISTINCT CASE WHEN last_read_at > NOW() - INTERVAL '30 days' THEN user_id END) as mau
      FROM user_reading_progress
    `);

    // User Retention Analysis
    const retentionStats = await db.query(`
      WITH user_cohorts AS (
        SELECT 
          u.id,
          u.created_at::date as signup_date,
          MIN(rp.created_at) as first_read_date,
          MAX(rp.last_read_at) as last_read_date,
          COUNT(DISTINCT rp.created_at::date) as reading_days
        FROM users u
        LEFT JOIN user_reading_progress rp ON u.id = rp.user_id
        WHERE u.created_at > NOW() - INTERVAL '30 days'
        GROUP BY u.id, u.created_at
      )
      SELECT 
        -- Day 1 retention (read within 24 hours of signup)
        COUNT(CASE WHEN first_read_date <= signup_date + INTERVAL '1 day' THEN 1 END) * 100.0 / COUNT(*) as day1_retention,
        -- Day 7 retention (read within 7 days)
        COUNT(CASE WHEN last_read_date >= signup_date + INTERVAL '6 days' THEN 1 END) * 100.0 / COUNT(*) as day7_retention,
        -- Day 30 retention (read within 30 days)  
        COUNT(CASE WHEN last_read_date >= signup_date + INTERVAL '29 days' THEN 1 END) * 100.0 / COUNT(*) as day30_retention,
        AVG(reading_days) as avg_reading_days
      FROM user_cohorts
    `);

    // Session Duration Analytics
    const sessionStats = await db.query(`
      WITH reading_sessions AS (
        SELECT 
          user_id,
          book_id,
          current_chapter_number,
          last_read_at,
          LAG(last_read_at) OVER (PARTITION BY user_id ORDER BY last_read_at) as prev_read_time
        FROM user_reading_progress
        ORDER BY user_id, last_read_at
      ),
      session_durations AS (
        SELECT 
          user_id,
          EXTRACT(EPOCH FROM (last_read_at - prev_read_time))/60 as session_minutes
        FROM reading_sessions
        WHERE prev_read_time IS NOT NULL 
          AND EXTRACT(EPOCH FROM (last_read_at - prev_read_time)) < 7200 -- Less than 2 hours
      )
      SELECT 
        AVG(session_minutes) as avg_session_minutes,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY session_minutes) as median_session_minutes,
        COUNT(*) as total_sessions
      FROM session_durations
    `);

    // Reading Frequency Patterns
    const frequencyStats = await db.query(`
      WITH user_reading_frequency AS (
        SELECT 
          user_id,
          COUNT(DISTINCT last_read_at::date) as reading_days_last_30,
          COUNT(*) as total_reading_sessions,
          AVG(progress_percentage) as avg_progress
        FROM user_reading_progress
        WHERE last_read_at > NOW() - INTERVAL '30 days'
        GROUP BY user_id
      )
      SELECT 
        -- Reading frequency distribution
        COUNT(CASE WHEN reading_days_last_30 >= 20 THEN 1 END) as daily_readers,
        COUNT(CASE WHEN reading_days_last_30 BETWEEN 10 AND 19 THEN 1 END) as frequent_readers,
        COUNT(CASE WHEN reading_days_last_30 BETWEEN 3 AND 9 THEN 1 END) as casual_readers,
        COUNT(CASE WHEN reading_days_last_30 BETWEEN 1 AND 2 THEN 1 END) as occasional_readers,
        AVG(reading_days_last_30) as avg_reading_days_per_user,
        AVG(total_reading_sessions) as avg_sessions_per_user
      FROM user_reading_frequency
    `);

    res.json({
      success: true,
      engagement: {
        activeUsers: activeUserStats.rows[0],
        retention: retentionStats.rows[0],
        sessions: sessionStats.rows[0],
        frequency: frequencyStats.rows[0]
      }
    });

  } catch (error) {
    console.error('User engagement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user engagement stats'
    });
  }
};

// Content Performance Analytics
const getContentPerformanceStats = async (req, res) => {
  try {
    // Book popularity and completion rates
    const bookPerformance = await db.query(`
      SELECT 
        b.id,
        b.title,
        b.author,
        b.genre,
        COUNT(DISTINCT rp.user_id) as unique_readers,
        AVG(rp.progress_percentage) as avg_completion_rate,
        COUNT(CASE WHEN rp.completed_at IS NOT NULL THEN 1 END) as completed_readers,
        AVG(EXTRACT(EPOCH FROM (rp.completed_at - rp.created_at))/86400) as avg_days_to_complete,
        COUNT(cc.id) as total_comments
      FROM books b
      LEFT JOIN user_reading_progress rp ON b.id = rp.book_id
      LEFT JOIN chapter_comments cc ON b.id = cc.book_id
      WHERE b.is_published = true
      GROUP BY b.id, b.title, b.author, b.genre
      ORDER BY unique_readers DESC
    `);

    // Genre performance analysis
    const genrePerformance = await db.query(`
      SELECT 
        b.genre,
        COUNT(DISTINCT b.id) as books_in_genre,
        COUNT(DISTINCT rp.user_id) as total_readers,
        AVG(rp.progress_percentage) as avg_completion_rate,
        COUNT(CASE WHEN rp.completed_at IS NOT NULL THEN 1 END) as completed_books,
        AVG(EXTRACT(EPOCH FROM (rp.completed_at - rp.created_at))/86400) as avg_completion_days
      FROM books b
      LEFT JOIN user_reading_progress rp ON b.id = rp.book_id
      WHERE b.is_published = true
      GROUP BY b.genre
      ORDER BY total_readers DESC
    `);

    // Chapter drop-off analysis
    const chapterDropoff = await db.query(`
      WITH chapter_stats AS (
        SELECT 
          b.title,
          rp.current_chapter_number,
          COUNT(*) as readers_at_chapter,
          LAG(COUNT(*)) OVER (PARTITION BY b.id ORDER BY rp.current_chapter_number) as prev_chapter_readers
        FROM books b
        JOIN user_reading_progress rp ON b.id = rp.book_id
        WHERE b.is_published = true
        GROUP BY b.id, b.title, rp.current_chapter_number
        ORDER BY b.id, rp.current_chapter_number
      )
      SELECT 
        title,
        current_chapter_number,
        readers_at_chapter,
        prev_chapter_readers,
        CASE 
          WHEN prev_chapter_readers > 0 THEN 
            ROUND((readers_at_chapter * 100.0 / prev_chapter_readers), 2)
          ELSE 100
        END as retention_rate
      FROM chapter_stats
      WHERE prev_chapter_readers IS NOT NULL
      ORDER BY retention_rate ASC
      LIMIT 20
    `);

    res.json({
      success: true,
      content: {
        bookPerformance: bookPerformance.rows,
        genrePerformance: genrePerformance.rows,
        chapterDropoff: chapterDropoff.rows
      }
    });

  } catch (error) {
    console.error('Content performance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content performance stats'
    });
  }
};

// Revenue & Monetization Analytics
const getRevenueStats = async (req, res) => {
  try {
    // Note: This assumes future payment tracking tables
    // For now, we'll create mock structure for coin-based revenue
    
    // User coin spending patterns (using mock data structure)
    const coinStats = await db.query(`
      SELECT 
        COUNT(DISTINCT user_id) as paying_users,
        0 as total_revenue, -- Placeholder for future payment integration
        0 as avg_revenue_per_user,
        COUNT(*) as total_chapter_unlocks
      FROM (
        SELECT DISTINCT user_id 
        FROM user_reading_progress 
        WHERE current_chapter_number >= 6 -- Assuming chapters 6+ require coins
      ) paid_content_users
    `);

    // Chapter unlock conversion rates
    const unlockStats = await db.query(`
      WITH chapter_access AS (
        SELECT 
          b.title,
          rp.current_chapter_number,
          COUNT(*) as users_reached_chapter,
          COUNT(CASE WHEN rp.current_chapter_number >= 6 THEN 1 END) as paid_chapter_access
        FROM books b
        JOIN user_reading_progress rp ON b.id = rp.book_id
        GROUP BY b.id, b.title, rp.current_chapter_number
      )
      SELECT 
        title,
        SUM(users_reached_chapter) as total_users,
        SUM(paid_chapter_access) as paid_conversions,
        ROUND(
          SUM(paid_chapter_access) * 100.0 / NULLIF(SUM(users_reached_chapter), 0), 
          2
        ) as conversion_rate
      FROM chapter_access
      GROUP BY title
      ORDER BY conversion_rate DESC
    `);

    // Daily check-in effectiveness (if implemented)
    const checkInStats = await db.query(`
      SELECT 
        COUNT(DISTINCT user_id) as daily_checkin_users,
        0 as total_coins_distributed, -- Placeholder for future rewards tracking
        0 as avg_coins_per_user
      FROM user_reading_progress
      WHERE last_read_at > NOW() - INTERVAL '1 day'
    `);

    res.json({
      success: true,
      revenue: {
        coinStats: coinStats.rows[0],
        unlockStats: unlockStats.rows,
        checkInStats: checkInStats.rows[0]
      }
    });

  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue stats'
    });
  }
};

// Technical Performance Analytics
const getTechnicalStats = async (req, res) => {
  try {
    // Database performance metrics
    const dbStats = await db.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables 
      WHERE tablename IN ('users', 'books', 'chapters', 'user_reading_progress')
      ORDER BY n_live_tup DESC
    `);

    // Error rate analysis (basic structure - would need error logging)
    const errorStats = {
      total_requests: 0, // Would be tracked by request logging middleware
      error_requests: 0,
      error_rate: 0,
      avg_response_time: 0
    };

    // User device/platform analysis (from user agent - if tracked)
    const platformStats = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT id) as unique_users_last_7_days
      FROM users
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);

    res.json({
      success: true,
      technical: {
        database: dbStats.rows,
        errors: errorStats,
        platform: platformStats.rows[0]
      }
    });

  } catch (error) {
    console.error('Technical stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch technical stats'
    });
  }
};

// Comprehensive analytics overview
const getAnalyticsOverview = async (req, res) => {
  try {
    // Get all stats in parallel
    const [
      engagementReq,
      contentReq,
      revenueReq,
      technicalReq
    ] = await Promise.allSettled([
      getUserEngagementStats(req, { json: data => data }),
      getContentPerformanceStats(req, { json: data => data }),
      getRevenueStats(req, { json: data => data }),
      getTechnicalStats(req, { json: data => data })
    ]);

    // Extract results from settled promises
    const engagement = engagementReq.status === 'fulfilled' ? engagementReq.value : {};
    const content = contentReq.status === 'fulfilled' ? contentReq.value : {};
    const revenue = revenueReq.status === 'fulfilled' ? revenueReq.value : {};
    const technical = technicalReq.status === 'fulfilled' ? technicalReq.value : {};

    res.json({
      success: true,
      overview: {
        engagement,
        content,
        revenue,
        technical,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview'
    });
  }
};

module.exports = {
  getUserEngagementStats,
  getContentPerformanceStats,
  getRevenueStats,
  getTechnicalStats,
  getAnalyticsOverview
};