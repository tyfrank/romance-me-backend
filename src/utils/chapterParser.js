// Professional chapter parser that supports multiple formats
const parseChapters = (fullText, options = {}) => {
  const {
    minChapterLength = 100,  // Minimum words per chapter
    maxChapters = 100,        // Maximum chapters to detect
    debug = false
  } = options;

  let chapters = [];
  
  // Strategy 1: Look for explicit chapter markers
  const chapterMarkers = [
    // Standard formats
    /^Chapter\s+(\d+)(?:\s*[:\-–—]?\s*(.*))?$/gmi,
    /^CHAPTER\s+(\d+)(?:\s*[:\-–—]?\s*(.*))?$/gmi,
    /^Ch\.?\s*(\d+)(?:\s*[:\-–—]?\s*(.*))?$/gmi,
    
    // Roman numerals
    /^Chapter\s+([IVXLCDM]+)(?:\s*[:\-–—]?\s*(.*))?$/gmi,
    
    // Just numbers
    /^(\d+)\.?\s*$/gm,
    
    // Part/Section markers
    /^Part\s+(\d+)(?:\s*[:\-–—]?\s*(.*))?$/gmi,
    /^Section\s+(\d+)(?:\s*[:\-–—]?\s*(.*))?$/gmi,
  ];

  // Try each pattern
  for (const pattern of chapterMarkers) {
    const matches = Array.from(fullText.matchAll(pattern));
    if (matches.length > 1) {
      if (debug) console.log(`Found ${matches.length} chapters using pattern: ${pattern}`);
      
      // Split by these markers
      let lastIndex = 0;
      matches.forEach((match, i) => {
        const startIndex = match.index;
        const chapterNum = match[1];
        const chapterTitle = match[2] || `Chapter ${chapterNum}`;
        
        // Get content until next chapter or end
        const nextMatch = matches[i + 1];
        const endIndex = nextMatch ? nextMatch.index : fullText.length;
        const content = fullText.substring(startIndex + match[0].length, endIndex).trim();
        
        if (content.split(/\s+/).length >= minChapterLength) {
          chapters.push({
            number: parseInt(chapterNum) || (i + 1),
            title: chapterTitle.trim(),
            content: content,
            wordCount: content.split(/\s+/).length
          });
        }
      });
      
      if (chapters.length > 0) break;
    }
  }

  // Strategy 2: Look for scene breaks if no chapter markers found
  if (chapters.length === 0) {
    const sceneBreaks = [
      /^\*\*\*+\s*$/gm,     // ***
      /^---+\s*$/gm,        // ---
      /^~~~+\s*$/gm,        // ~~~
      /^===+\s*$/gm,        // ===
      /^\#\#\#+\s*$/gm,     // ###
    ];

    for (const pattern of sceneBreaks) {
      const sections = fullText.split(pattern);
      if (sections.length > 1) {
        if (debug) console.log(`Found ${sections.length} sections using scene break: ${pattern}`);
        
        sections.forEach((section, i) => {
          const content = section.trim();
          if (content.split(/\s+/).length >= minChapterLength) {
            chapters.push({
              number: i + 1,
              title: `Chapter ${i + 1}`,
              content: content,
              wordCount: content.split(/\s+/).length
            });
          }
        });
        
        if (chapters.length > 0) break;
      }
    }
  }

  // Strategy 3: Look for consistent paragraph breaks (double newlines)
  if (chapters.length === 0) {
    // Check if there are consistent large gaps
    const paragraphs = fullText.split(/\n\n+/);
    
    // Group paragraphs into chapters based on size
    let currentChapter = [];
    let currentWordCount = 0;
    let chapterNum = 1;
    const targetWordsPerChapter = Math.max(1500, fullText.split(/\s+/).length / 32); // Aim for 32 chapters or 1500 words each
    
    paragraphs.forEach(para => {
      const words = para.trim().split(/\s+/);
      currentChapter.push(para);
      currentWordCount += words.length;
      
      // Start new chapter if we've reached target size
      if (currentWordCount >= targetWordsPerChapter && currentChapter.length > 0) {
        const content = currentChapter.join('\n\n').trim();
        if (content.split(/\s+/).length >= minChapterLength) {
          chapters.push({
            number: chapterNum,
            title: `Chapter ${chapterNum}`,
            content: content,
            wordCount: content.split(/\s+/).length
          });
          chapterNum++;
        }
        currentChapter = [];
        currentWordCount = 0;
      }
    });
    
    // Add remaining content as last chapter
    if (currentChapter.length > 0) {
      const content = currentChapter.join('\n\n').trim();
      if (content.split(/\s+/).length >= minChapterLength) {
        chapters.push({
          number: chapterNum,
          title: `Chapter ${chapterNum}`,
          content: content,
          wordCount: content.split(/\s+/).length
        });
      }
    }
  }

  // Strategy 4: Fall back to equal division
  if (chapters.length === 0) {
    const words = fullText.split(/\s+/);
    const totalWords = words.length;
    const numChapters = Math.min(32, Math.max(1, Math.floor(totalWords / 1500))); // Target ~1500 words per chapter
    const wordsPerChapter = Math.ceil(totalWords / numChapters);
    
    if (debug) console.log(`Falling back to equal division: ${numChapters} chapters of ~${wordsPerChapter} words`);
    
    for (let i = 0; i < numChapters; i++) {
      const start = i * wordsPerChapter;
      const end = Math.min((i + 1) * wordsPerChapter, words.length);
      const chapterWords = words.slice(start, end);
      
      if (chapterWords.length >= minChapterLength) {
        chapters.push({
          number: i + 1,
          title: `Chapter ${i + 1}`,
          content: chapterWords.join(' '),
          wordCount: chapterWords.length
        });
      }
    }
  }

  // Limit to maxChapters
  if (chapters.length > maxChapters) {
    chapters = chapters.slice(0, maxChapters);
  }

  return chapters;
};

// Format detection helper
const detectFormat = (fullText) => {
  const formats = [];
  
  if (/^Chapter\s+\d+/gmi.test(fullText)) formats.push('Chapter N');
  if (/^CHAPTER\s+\d+/gmi.test(fullText)) formats.push('CHAPTER N');
  if (/^\d+\.?\s*$/gm.test(fullText)) formats.push('Numbered');
  if (/^\*\*\*+\s*$/gm.test(fullText)) formats.push('Asterisk breaks');
  if (/^---+\s*$/gm.test(fullText)) formats.push('Dash breaks');
  
  return formats.length > 0 ? formats : ['No clear format detected'];
};

module.exports = {
  parseChapters,
  detectFormat
};