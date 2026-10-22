const express = require('express');
const router = express.Router();
const { db, syncBookAvailability } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/books - List books with search and filter
router.get('/', (req, res) => {
  try {
    const { search, category, available } = req.query;

    let query = `
      SELECT b.*, 
        (SELECT COUNT(*) FROM transactions t WHERE t.book_id = b.id AND t.status IN ('ISSUED', 'OVERDUE')) as currently_issued
      FROM books b
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.shelf_location LIKE ?)`;
      params.push(term, term, term, term);
    }

    if (category && category !== 'All') {
      query += ` AND b.category = ?`;
      params.push(category);
    }

    if (available === 'true') {
      query += ` AND b.available_copies > 0`;
    } else if (available === 'false') {
      query += ` AND b.available_copies = 0`;
    }

    query += ` ORDER BY b.title ASC`;

    const books = db.prepare(query).all(...params);
    res.json({ books, total: books.length });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to retrieve books.' });
  }
});

// GET /api/books/categories - Get distinct categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM books ORDER BY category ASC').all();
    res.json(categories.map(c => c.category));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// GET /api/books/:id - Get single book details and borrowing history
router.get('/:id', (req, res) => {
  try {
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const history = db.prepare(`
      SELECT t.*, s.name as student_name, s.student_id as student_code, s.email as student_email
      FROM transactions t
      JOIN students s ON t.student_id = s.id
      WHERE t.book_id = ?
      ORDER BY t.issue_date DESC
    `).all(req.params.id);

    res.json({ book, history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve book details.' });
  }
});

// POST /api/books - Add new book
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, author, isbn, category, publisher, publish_year, total_copies, shelf_location, description } = req.body;

    if (!title || !author || !isbn || !category) {
      return res.status(400).json({ error: 'Title, Author, ISBN, and Category are required.' });
    }

    // Check ISBN uniqueness
    const existing = db.prepare('SELECT id FROM books WHERE isbn = ?').get(isbn.trim());
    if (existing) {
      return res.status(400).json({ error: 'A book with this ISBN already exists.' });
    }

    const total = parseInt(total_copies) || 1;
    if (total < 1) {
      return res.status(400).json({ error: 'Total copies must be at least 1.' });
    }

    const stmt = db.prepare(`
      INSERT INTO books (title, author, isbn, category, publisher, publish_year, total_copies, available_copies, shelf_location, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title.trim(),
      author.trim(),
      isbn.trim(),
      category.trim(),
      publisher ? publisher.trim() : null,
      publish_year ? parseInt(publish_year) : null,
      total,
      total, // available_copies starts equal to total_copies
      shelf_location ? shelf_location.trim() : 'General Shelf',
      description ? description.trim() : ''
    );

    const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Book added successfully', book: newBook });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ error: error.message || 'Failed to add book.' });
  }
});

// PUT /api/books/:id - Update book
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, isbn, category, publisher, publish_year, total_copies, shelf_location, description } = req.body;

    const currentBook = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!currentBook) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    // Check if new ISBN conflicts with another book
    if (isbn && isbn.trim() !== currentBook.isbn) {
      const conflict = db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(isbn.trim(), bookId);
      if (conflict) {
        return res.status(400).json({ error: 'Another book already exists with this ISBN.' });
      }
    }

    const newTotal = parseInt(total_copies) || currentBook.total_copies;
    const currentlyIssued = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE book_id = ? AND status IN ('ISSUED', 'OVERDUE')
    `).get(bookId).count;

    if (newTotal < currentlyIssued) {
      return res.status(400).json({
        error: `Cannot reduce total copies below currently issued copies (${currentlyIssued}).`
      });
    }

    const newAvailable = newTotal - currentlyIssued;

    db.prepare(`
      UPDATE books SET
        title = ?,
        author = ?,
        isbn = ?,
        category = ?,
        publisher = ?,
        publish_year = ?,
        total_copies = ?,
        available_copies = ?,
        shelf_location = ?,
        description = ?
      WHERE id = ?
    `).run(
      title ? title.trim() : currentBook.title,
      author ? author.trim() : currentBook.author,
      isbn ? isbn.trim() : currentBook.isbn,
      category ? category.trim() : currentBook.category,
      publisher !== undefined ? publisher : currentBook.publisher,
      publish_year ? parseInt(publish_year) : currentBook.publish_year,
      newTotal,
      newAvailable,
      shelf_location !== undefined ? shelf_location : currentBook.shelf_location,
      description !== undefined ? description : currentBook.description,
      bookId
    );

    const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    res.json({ message: 'Book updated successfully', book: updatedBook });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: error.message || 'Failed to update book.' });
  }
});

// DELETE /api/books/:id - Delete book
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const bookId = req.params.id;

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    // Check if book has active issues
    const activeTxn = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE book_id = ? AND status IN ('ISSUED', 'OVERDUE')
    `).get(bookId).count;

    if (activeTxn > 0) {
      return res.status(400).json({
        error: `Cannot delete book while there are ${activeTxn} active copies currently issued to students.`
      });
    }

    // Delete associated transactions & fines first or let CASCADE handle if configured
    db.prepare('DELETE FROM transactions WHERE book_id = ?').run(bookId);
    db.prepare('DELETE FROM books WHERE id = ?').run(bookId);

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: error.message || 'Failed to delete book.' });
  }
});

module.exports = router;
