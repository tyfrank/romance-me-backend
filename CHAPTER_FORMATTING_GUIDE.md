# Chapter Formatting Guide

## Supported Chapter Formats

The system now supports multiple chapter formatting styles. Use any of these formats for automatic chapter detection:

### 1. Standard Chapter Headers
```
Chapter 1
Chapter content here...

Chapter 2  
More content...

Chapter 3: The Beginning
Content with chapter title...
```

### 2. Uppercase Format
```
CHAPTER 1
Content...

CHAPTER 2
Content...
```

### 3. Roman Numerals
```
Chapter I
Content...

Chapter II
Content...

Chapter III
Content...
```

### 4. Simple Numbering
```
1.
First chapter content...

2.
Second chapter content...

3.
Third chapter content...
```

Or just numbers alone on a line:
```
1
First chapter content...

2
Second chapter content...
```

### 5. Scene Breaks
Use any of these scene break patterns to separate chapters:
- `***` (three or more asterisks)
- `---` (three or more dashes)
- `~~~` (three or more tildes)
- `===` (three or more equals)
- `###` (three or more hashes)

Example:
```
First chapter content here...

***

Second chapter content here...

---

Third chapter content here...
```

### 6. Part/Section Format
```
Part 1
Content...

Part 2
Content...

Section 1
Content...
```

## Automatic Detection

If no explicit chapter markers are found, the system will:

1. **Look for natural breaks**: Double line breaks that might indicate chapter boundaries
2. **Smart grouping**: Group paragraphs into chapters of approximately 1,500 words
3. **Target detection**: Aims to detect up to 32 chapters (or more if marked)
4. **Equal division**: As a last resort, divides content equally into chapters

## Best Practices

1. **Be consistent**: Use the same format throughout your book
2. **Clear separation**: Leave blank lines between chapters
3. **Minimum length**: Chapters should have at least 100 words
4. **Chapter titles**: Optional - can be included after the chapter number

## Partial Uploads / Ongoing Stories

The system fully supports:
- **Partial uploads**: Upload chapters as you write them
- **Ongoing stories**: Mark books as "ongoing" vs "completed"
- **Chapter updates**: Add new chapters to existing books
- **Serial publishing**: Perfect for releasing chapters over time

## Example Upload

```text
Chapter 1: The Beginning

It was a dark and stormy night...
[paragraph content]
[more content]

Chapter 2: The Journey

The next morning brought sunshine...
[paragraph content]
[more content]

Chapter 3: The Discovery

Three days had passed since...
[paragraph content]
[more content]
```

## Troubleshooting

If chapters aren't detected properly:

1. **Check formatting**: Ensure chapter markers are on their own lines
2. **Check consistency**: Use the same format throughout
3. **Check separation**: Ensure clear breaks between chapters
4. **Minimum content**: Each chapter needs at least 100 words

## Testing Your Format

Before uploading, you can test detection by:
1. Checking if your chapter markers are clearly visible
2. Ensuring consistent formatting throughout
3. Verifying each chapter has substantial content

The improved parser will show in the console:
- Number of chapters detected
- Format(s) identified
- Any issues with parsing