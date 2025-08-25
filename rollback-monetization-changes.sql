-- COMPLETE ROLLBACK SCRIPT FOR MONETIZATION CHANGES
-- Use this to undo ALL changes if something goes wrong

-- ==========================================
-- ROLLBACK STEP 1: Remove added columns from user_chapter_unlocks
-- ==========================================

-- Remove chapter_number column (safe - data can be recalculated)
ALTER TABLE user_chapter_unlocks 
DROP COLUMN IF EXISTS chapter_number;

-- Remove ad_views_used column (safe - was default 0 anyway)
ALTER TABLE user_chapter_unlocks 
DROP COLUMN IF EXISTS ad_views_used;

-- Remove expires_at column (safe - was nullable anyway)
ALTER TABLE user_chapter_unlocks 
DROP COLUMN IF EXISTS expires_at;

-- ==========================================
-- ROLLBACK STEP 2: Reset chapters pricing to original state
-- ==========================================

-- Reset all chapters to free state (original condition)
UPDATE chapters 
SET 
  coin_cost = 0,
  is_premium = false,
  unlock_type = 'free';

-- ==========================================
-- ROLLBACK STEP 3: Remove user_subscriptions table (if created)
-- ==========================================

DROP TABLE IF EXISTS user_subscriptions;

-- ==========================================
-- ROLLBACK STEP 4: Remove any added indexes
-- ==========================================

DROP INDEX IF EXISTS idx_chapters_premium_lookup;
DROP INDEX IF EXISTS idx_user_unlocks_fast_lookup;
DROP INDEX IF EXISTS idx_user_subscriptions_active;

-- ==========================================
-- VERIFICATION QUERIES - Run these to confirm rollback
-- ==========================================

-- Check user_chapter_unlocks structure
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_chapter_unlocks' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check all chapters are free again  
SELECT 
  COUNT(*) as total_chapters,
  COUNT(CASE WHEN is_premium = true THEN 1 END) as premium_chapters,
  COUNT(CASE WHEN coin_cost > 0 THEN 1 END) as paid_chapters
FROM chapters;

-- Should return: premium_chapters = 0, paid_chapters = 0