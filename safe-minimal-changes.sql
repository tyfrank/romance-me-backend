-- SAFE MINIMAL DATABASE CHANGES FOR MONETIZATION
-- Each change is separate and reversible

-- ==========================================
-- CHANGE #1: Add chapter_number to user_chapter_unlocks
-- WHY: Makes queries faster, avoids complex joins
-- RISK: Very low - just adding a nullable column
-- ==========================================
ALTER TABLE user_chapter_unlocks 
ADD COLUMN IF NOT EXISTS chapter_number INTEGER;

-- ==========================================  
-- CHANGE #2: Add ad_views_used to user_chapter_unlocks
-- WHY: Support for ad-based unlocks in the future
-- RISK: Very low - just adding a nullable column with default
-- ==========================================
ALTER TABLE user_chapter_unlocks 
ADD COLUMN IF NOT EXISTS ad_views_used INTEGER DEFAULT 0;

-- ==========================================
-- CHANGE #3: Add expires_at to user_chapter_unlocks  
-- WHY: Support for time-limited unlocks
-- RISK: Very low - just adding a nullable timestamp column
-- ==========================================
ALTER TABLE user_chapter_unlocks 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- ==========================================
-- DATA UPDATE: Populate chapter_number from existing data
-- WHY: Fill in the new column with existing chapter data
-- RISK: Low - just copying existing data, no data loss
-- ==========================================
UPDATE user_chapter_unlocks 
SET chapter_number = c.chapter_number
FROM chapters c 
WHERE user_chapter_unlocks.chapter_id = c.id 
  AND user_chapter_unlocks.chapter_number IS NULL;

-- ==========================================
-- PRICING UPDATE: Set coin costs based on chapter numbers
-- WHY: Your chapters already have the columns, just need values
-- RISK: Low - just updating existing columns with calculated values
-- ==========================================
UPDATE chapters 
SET 
  coin_cost = CASE
    WHEN chapter_number <= 5 THEN 0
    WHEN chapter_number <= 10 THEN 20
    WHEN chapter_number <= 20 THEN 25
    WHEN chapter_number <= 50 THEN 30 + FLOOR((chapter_number - 21) / 3)
    WHEN chapter_number <= 100 THEN 40 + FLOOR((chapter_number - 51) / 5)
    WHEN chapter_number <= 200 THEN 50 + FLOOR((chapter_number - 101) / 10)
    ELSE 70
  END,
  is_premium = CASE 
    WHEN chapter_number <= 5 THEN false
    ELSE true
  END,
  unlock_type = CASE
    WHEN chapter_number <= 5 THEN 'free'
    ELSE 'premium'
  END
WHERE coin_cost = 0 OR is_premium = false; -- Only update if not already set