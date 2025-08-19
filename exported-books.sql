-- Real books export

INSERT INTO books (
  id, title, description, synopsis, author, genre, content_rating,
  total_chapters, word_count, reading_time_minutes, cover_image_url,
  status, is_published, is_featured, created_at, updated_at
) VALUES (
  'e6c82029-a668-41f4-8f76-6d780ca145d3',
  'Crown Me Yours',
  'CEO Billionaire Office Romance',
  'You''re a brilliant financial analyst who discovers massive fraud in Damien Cross''s empire—the ruthless billionaire who destroyed your father''s company years ago. When you march into his office with evidence that could ruin him, he makes you an offer: become his fake fiancée to clean up his reputation, and he''ll restore your family''s fortune. But proximity breeds a dangerous attraction neither of you expected. As corporate enemies circle and old wounds resurface, you must decide if the man who once represented everything you hated could be the love you never knew you needed.
The deeper you dig into his world of power and privilege, the more you realize his cold exterior hides devastating vulnerability—and that your revenge might destroy you both.',
  'RomanceMe Author',
  '[]',
  '18+',
  12,
  20179,
  101,
  NULL,
  'trending',
  true,
  false,
  '2025-08-17T23:03:15.299Z',
  '2025-08-18T05:18:00.806Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO books (
  id, title, description, synopsis, author, genre, content_rating,
  total_chapters, word_count, reading_time_minutes, cover_image_url,
  status, is_published, is_featured, created_at, updated_at
) VALUES (
  '45e4582f-85b7-4646-bda2-203d51ab2c80',
  'Bound to the Midnight Alpha',
  'Werewolf',
  'You’ve just moved to a remote mountain town for a fresh start, but the locals keep glancing at you like you don’t belong. When a midnight attack leaves you in the arms of Kade Blackthorn—the ruthless Alpha whose pack is both feared and hunted—you feel the mate bond snap into place. But Kade doesn’t want a mate. He wants control. As rival packs close in and your own dormant wolf stirs to life, you’ll have to decide: tame the Alpha, or match his darkness bite for bite.',
  'RomanceMe Author',
  '[]',
  '18+',
  12,
  13441,
  68,
  NULL,
  'ongoing',
  true,
  false,
  '2025-08-18T04:25:22.832Z',
  '2025-08-18T05:17:51.725Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO books (
  id, title, description, synopsis, author, genre, content_rating,
  total_chapters, word_count, reading_time_minutes, cover_image_url,
  status, is_published, is_featured, created_at, updated_at
) VALUES (
  '7708242a-d122-450b-89c4-5fd73901d585',
  'Blood Moon Rising',
  'Werewolf',
  'When you inherit a crumbling mansion in Salem, you discover it comes with a centuries-old tenant: Lucian, a vampire bound to protect the bloodline of the witch who once saved his life. That witch was your ancestor, and now the binding transfers to you. But Lucian is no grateful guardian—he''s furious about his eternal servitude and takes every opportunity to remind you that he didn''t choose this fate.
As supernatural threats emerge seeking to claim your family''s ancient power, you must learn to work with the vampire who alternately protects and challenges you. His centuries of loneliness have made him cynical about love, but your fierce independence and refusal to be intimidated slowly crack his defenses. When the binding ritual demands the ultimate sacrifice, you''ll discover that some chains are worth keeping.',
  'RomanceMe Author',
  '[]',
  '18+',
  12,
  16683,
  84,
  NULL,
  'ongoing',
  true,
  false,
  '2025-08-18T04:32:15.887Z',
  '2025-08-19T19:29:51.957Z'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO books (
  id, title, description, synopsis, author, genre, content_rating,
  total_chapters, word_count, reading_time_minutes, cover_image_url,
  status, is_published, is_featured, created_at, updated_at
) VALUES (
  '243aa213-7705-45e0-a6d4-e19e2c5e00a8',
  'The Devil''s Intern',
  'CEO Billionaire',
  'You land an internship at the most exclusive marketing agency in the city, run by Damian Cross—a legend in the boardroom and the bedroom. A chance encounter reveals his dominant side, and soon you’re pulled into a world of private contracts, whispered commands, and dangerous desire. But when a rival company targets you to get to him, passion and power collide.',
  'RomanceMe Author',
  '[]',
  '18+',
  28,
  37229,
  187,
  NULL,
  'ongoing',
  true,
  false,
  '2025-08-19T05:38:45.530Z',
  '2025-08-19T20:19:08.953Z'
) ON CONFLICT (id) DO NOTHING;

