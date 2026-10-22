const express = require('express');
const router = express.Router();
const { db, syncBookAvailability, refreshOverdueFines } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/transactions - List all transactions with search and filters
router.get('/', (req, res) => {
  try {
    refreshOverdueFines();

    const { status, search, studentId, bookId, fromDate, toDate } = req.query;

    let query = `
      SELECT t.*, 
        b.title as book_title, b.author as book_author, b.isbn as book_isbn,
        s.name as student_name, s.student_id as student_code, s.email as student_email,
        f.id as fine_id, f.amount as fine_amount, f.status as fine_status, f.days_overdue
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN students s ON t.student_id = s.id
      LEFT JOIN fines f ON f.transaction_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (studentId) {
      query += ` AND t.student_id = ?`;
      params.push(studentId);
    }

    if (bookId) {
      query += ` AND t.book_id = ?`;
      params.push(bookId);
    }

    if (fromDate) {
      query += ` AND t.issue_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND t.issue_date <= ?`;
      params.push(toDate);
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (t.transaction_code LIKE ? OR b.title LIKE ? OR s.name LIKE ? OR s.student_id LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY t.created_at DESC`;

    const transactions = db.prepare(query).all(...params);
    res.json({ transactions, total: transactions.length });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions.' });
  }
});

// POST /api/transactions/issue - Issue a book to a student
router.post('/issue', authenticateToken, (req, res) => {
  try {
    const { book_id, student_id, due_date, remarks } = req.body;

    if (!book_id || !student_id) {
      return res.status(400).json({ error: 'Book ID and Student ID are required.' });
    }

    // 1. Verify student exists and is active
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Selected student does not exist.' });
    }
    if (student.status === 'SUSPENDED') {
      return res.status(400).json({ error: 'Student account is suspended. Books cannot be issued.' });
    }

    // 2. Check max books policy
    const maxBooksSetting = db.prepare("SELECT value FROM settings WHERE key = 'max_books_per_student'").get();
    const maxBooks = maxBooksSetting ? parseInt(maxBooksSetting.value) || 3 : 3;

    const currentIssued = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE student_id = ? AND status IN ('ISSUED', 'OVERDUE')
    `).get(student_id).count;

    if (currentIssued >= maxBooks) {
      return res.status(400).json({
        error: `Student has reached the maximum borrowing limit of ${maxBooks} books.`
      });
    }

    // 3. Check if student already holds a copy of this exact book
    const alreadyHolding = db.prepare(`
      SELECT id FROM transactions 
      WHERE student_id = ? AND book_id = ? AND status IN ('ISSUED', 'OVERDUE')
    `).get(student_id, book_id);

    if (alreadyHolding) {
      return res.status(400).json({
        error: 'Student currently has an active copy of this exact book checked out.'
      });
    }

    // 4. Verify book exists and has available copies
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
    if (!book) {
      return res.status(404).json({ error: 'Selected book does not exist.' });
    }
    if (book.available_copies <= 0) {
      return res.status(400).json({
        error: `"${book.title}" is currently out of stock. No copies available for issue.`
      });
    }

    // 5. Calculate issue and due dates
    const today = new Date();
    const issueDateStr = today.toISOString().split('T')[0];

    let dueDateStr = due_date;
    if (!dueDateStr) {
      const durationSetting = db.prepare("SELECT value FROM settings WHERE key = 'borrow_duration_days'").get();
      const durationDays = durationSetting ? parseInt(durationSetting.value) || 14 : 14;
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + durationDays);
      dueDateStr = targetDate.toISOString().split('T')[0];
    }

    // 6. Generate unique transaction code
    const txnCode = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    // 7. Atomic transaction: Insert txn + decrement book stock
    const issueTxn = db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO transactions (transaction_code, book_id, student_id, issue_date, due_date, status, remarks)
        VALUES (?, ?, ?, ?, ?, 'ISSUED', ?)
      `);
      const result = insertStmt.run(txnCode, book_id, student_id, issueDateStr, dueDateStr, remarks || null);

      db.prepare(`
        UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0
      `).run(book_id);

      return result.lastInsertRowid;
    });

    const newTxnId = issueTxn();
    const createdTxn = db.prepare(`
      SELECT t.*, b.title as book_title, s.name as student_name
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN students s ON t.student_id = s.id
      WHERE t.id = ?
    `).get(newTxnId);

    res.status(201).json({
      message: `Book "${book.title}" issued successfully to ${student.name}.`,
      transaction: createdTxn
    });
  } catch (error) {
    console.error('Error issuing book:', error);
    res.status(500).json({ error: error.message || 'Failed to issue book.' });
  }
});

// POST /api/transactions/return/:id - Return a book
router.post('/return/:id', authenticateToken, (req, res) => {
  try {
    const txnId = req.params.id;
    const { return_date, condition_notes } = req.body;

    const txn = db.prepare(`
      SELECT t.*, b.title as book_title, b.available_copies, b.total_copies, s.name as student_name
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      JOIN students s ON t.student_id = s.id
      WHERE t.id = ?
    `).get(txnId);

    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // Prevent duplicate return
    if (txn.status === 'RETURNED') {
      return res.status(400).json({
        error: `This book has already been returned on ${txn.return_date}. Duplicate return is not allowed.`
      });
    }

    const todayStr = return_date || new Date().toISOString().split('T')[0];
    const dueDate = new Date(txn.due_date);
    const returnDate = new Date(todayStr);

    let daysOverdue = 0;
    let fineAmount = 0.0;

    if (returnDate > dueDate) {
      const diffTime = returnDate - dueDate;
      daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const rateSetting = db.prepare("SELECT value FROM settings WHERE key = 'daily_fine_rate'").get();
      const dailyRate = rateSetting ? parseFloat(rateSetting.value) || 1.5 : 1.5;
      fineAmount = parseFloat((daysOverdue * dailyRate).toFixed(2));
    }

    // Atomic transaction for return & stock increment
    const returnTxn = db.transaction(() => {
      // 1. Update transaction
      db.prepare(`
        UPDATE transactions 
        SET status = 'RETURNED', return_date = ?, remarks = COALESCE(?, remarks)
        WHERE id = ?
      `).run(todayStr, condition_notes || txn.remarks, txnId);

      // 2. Increment book available copies (not exceeding total)
      db.prepare(`
        UPDATE books 
        SET available_copies = MIN(total_copies, available_copies + 1)
        WHERE id = ?
      `).run(txn.book_id);

      // 3. Handle Fine if overdue
      let fineRecord = null;
      if (daysOverdue > 0 && fineAmount > 0) {
        const existingFine = db.prepare('SELECT * FROM fines WHERE transaction_id = ?').get(txnId);
        if (existingFine) {
          if (existingFine.status === 'UNPAID') {
            db.prepare(`
              UPDATE fines SET amount = ?, days_overdue = ?, notes = ? WHERE id = ?
            `).run(fineAmount, daysOverdue, `Calculated on return (${daysOverdue} days late)`, existingFine.id);
          }
          fineRecord = db.prepare('SELECT * FROM fines WHERE id = ?').get(existingFine.id);
        } else {
          const insertFine = db.prepare(`
            INSERT INTO fines (transaction_id, student_id, amount, days_overdue, status, notes)
            VALUES (?, ?, ?, ?, 'UNPAID', ?)
          `);
          const fineRes = insertFine.run(txnId, txn.student_id, fineAmount, daysOverdue, `Late return (${daysOverdue} days overdue)`);
          fineRecord = db.prepare('SELECT * FROM fines WHERE id = ?').get(fineRes.lastInsertRowid);
        }
      }

      return fineRecord;
    });

    const fineResult = returnTxn();

    res.json({
      message: daysOverdue > 0
        ? `Book returned successfully. Overdue by ${daysOverdue} days. Fine of $${fineAmount.toFixed(2)} generated.`
        : `Book returned successfully on time. Stock updated.`,
      daysOverdue,
      fineAmount,
      fine: fineResult
    });
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).json({ error: error.message || 'Failed to process return.' });
  }
});

module.exports = router;
