// Admin Controller - Book import endpoint
import { Request, Response } from 'express'
import { BookImporter } from '@/scripts/bookImporter'

export class AdminController {
  /**
   * Import book via API
   * POST /api/admin/import-book
   */
  public static async importBook(req: Request, res: Response) {
    try {
      const { content, title, author, description, genre, tags } = req.body

      if (!content || !title) {
        return res.status(400).json({
          success: false,
          message: 'Book content and title are required'
        })
      }

      // Parse and import book
      const bookData = BookImporter.parseBookText(
        content,
        title,
        author || 'RomanceMe',
        description,
        genre || 'Contemporary Romance',
        tags || []
      )

      const bookId = await BookImporter.importBook(bookData)

      res.status(201).json({
        success: true,
        message: `Book "${title}" imported successfully`,
        data: {
          bookId,
          title: bookData.title,
          chaptersImported: bookData.chapters.length,
          totalWordCount: bookData.chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
        }
      })
    } catch (error) {
      console.error('Import error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to import book',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Parse book preview (test parser without saving)
   * POST /api/admin/parse-book
   */
  public static async parseBookPreview(req: Request, res: Response) {
    try {
      const { content, title } = req.body

      if (!content || !title) {
        return res.status(400).json({
          success: false,
          message: 'Book content and title are required'
        })
      }

      // Parse book without importing
      const bookData = BookImporter.parseBookText(content, title)

      res.status(200).json({
        success: true,
        message: 'Book parsed successfully',
        data: {
          title: bookData.title,
          totalChapters: bookData.chapters.length,
          totalWordCount: bookData.chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
          chapters: bookData.chapters.map(ch => ({
            number: ch.chapterNumber,
            title: ch.title,
            wordCount: ch.wordCount,
            preview: ch.content.substring(0, 200) + '...'
          }))
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to parse book',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Update book details
   * PUT /api/admin/books/:id
   */
  public static async updateBook(req: Request, res: Response) {
    try {
      const { id } = req.params
      const updateData: any = {}

      // Parse form data or JSON
      if (req.body.title) updateData.title = req.body.title
      if (req.body.author) updateData.author = req.body.author
      if (req.body.description) updateData.description = req.body.description
      if (req.body.synopsis) updateData.description = req.body.synopsis // Map synopsis to description
      if (req.body.contentRating) updateData.ageRating = req.body.contentRating
      
      // Handle genre - can be JSON string or array
      if (req.body.genre) {
        let genres = req.body.genre
        if (typeof genres === 'string') {
          try {
            genres = JSON.parse(genres)
          } catch {
            // If it's not JSON, treat it as a single genre
            genres = [genres]
          }
        }
        updateData.tags = Array.isArray(genres) ? genres : [genres]
        updateData.genre = Array.isArray(genres) ? genres[0] || 'Romance' : genres
      }

      // Handle status updates
      if (req.body.status) {
        switch(req.body.status) {
          case 'completed':
            updateData.isPublished = true
            break
          case 'new':
          case 'trending':
            updateData.isFeatured = true
            break
        }
      }

      // Update book in database using Prisma
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      const updatedBook = await prisma.book.update({
        where: { id },
        data: updateData
      })

      await prisma.$disconnect()

      res.status(200).json({
        success: true,
        message: 'Book updated successfully',
        data: {
          book: updatedBook
        }
      })
    } catch (error) {
      console.error('Update book error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to update book',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get all books
   * GET /api/admin/books
   */
  public static async getBooks(req: Request, res: Response) {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      const books = await prisma.book.findMany({
        include: {
          chapters: {
            select: {
              id: true,
              chapterNumber: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      await prisma.$disconnect()

      res.status(200).json({
        success: true,
        data: {
          books
        }
      })
    } catch (error) {
      console.error('Get books error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get books',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get single book by ID
   * GET /api/admin/books/:id
   */
  public static async getBook(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      const book = await prisma.book.findUnique({
        where: { id },
        include: {
          chapters: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
              wordCount: true
            },
            orderBy: {
              chapterNumber: 'asc'
            }
          }
        }
      })

      await prisma.$disconnect()

      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        })
      }

      // Map fields to match frontend expectations
      const mappedBook = {
        ...book,
        content_rating: book.ageRating,
        cover_image_url: book.coverImage,
        status: book.isPublished ? 'completed' : 'ongoing'
      }

      res.status(200).json({
        success: true,
        data: {
          book: mappedBook
        }
      })
    } catch (error) {
      console.error('Get book error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to get book',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Delete book
   * DELETE /api/admin/books/:id
   */
  public static async deleteBook(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      await prisma.book.delete({
        where: { id }
      })

      await prisma.$disconnect()

      res.status(200).json({
        success: true,
        message: 'Book deleted successfully'
      })
    } catch (error) {
      console.error('Delete book error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to delete book',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}