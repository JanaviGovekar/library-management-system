const express = require('express');
const router = express.Router();
const { db, refreshOverdueFines } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/fines - List all fines with filters
router.get('/', (req, res) => {
  try {
    refreshOverdueFines();

    const { status, studentId, search } = req.query;

    let query = `
      SELECT f.*,
        s.name as student_name, s.student_id as student_code, s.email as student_email,
        t.transaction_code, t.issue_date, t.due_date, t.return_date,
        b.title as book_title, b.isbn as book_isbn
      FROM fines f
      JOIN students s ON f.student_id = s.id
      JOIN transactions t ON f.transaction_id = t.id
      JOIN books b ON t.book_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      query += ` AND f.status = ?`;
      params.push(status);
    }

    if (studentId) {
      query += ` AND f.student_id = ?`;
      params.push(studentId);
    }

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (s.name LIKE ? OR s.student_id LIKE ? OR b.title LIKE ? OR f.receipt_no LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY f.created_at DESC`;

    const fines = db.prepare(query).all(...params);

    // Summary calculation
    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_fines,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'UNPAID' THEN amount ELSE 0 END), 0) as total_unpaid,
        COUNT(CASE WHEN status = 'UNPAID' THEN 1 END) as unpaid_count
      FROM fines
    `).get();

    res.json({ fines, summary });
  } catch (error) {
    console.error('Error fetching fines:', error);
    res.status(500).json({ error: 'Failed to retrieve fines.' });
  }
});

// POST /api/fines/pay/:id - Settle/pay a fine
router.post('/pay/:id', authenticateToken, (req, res) => {
  try {
    const fineId = req.params.id;
    const { payment_method, receipt_no, notes } = req.body;

    const fine = db.prepare('SELECT * FROM fines WHERE id = ?').get(fineId);
    if (!fine) {
      return res.status(404).json({ error: 'Fine record not found.' });
    }

    if (fine.status === 'PAID') {
      return res.status(400).json({ error: 'This fine has already been paid and settled.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const generatedReceipt = receipt_no || `REC-${Date.now().toString().slice(-6)}`;

    db.prepare(`
      UPDATE fines SET
        status = 'PAID',
        paid_date = ?,
        payment_method = ?,
        receipt_no = ?,
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(todayStr, payment_method || 'Cash', generatedReceipt, notes, fineId);

    const updatedFine = db.prepare(`
      SELECT f.*, s.name as student_name, b.title as book_title
      FROM fines f
      JOIN students s ON f.student_id = s.id
      JOIN transactions t ON f.transaction_id = t.id
      JOIN books b ON t.book_id = b.id
      WHERE f.id = ?
    `).get(fineId);

    res.json({
      message: `Fine of $${fine.amount.toFixed(2)} marked as PAID. Receipt #${generatedReceipt}`,
      fine: updatedFine
    });
  } catch (error) {
    console.error('Error paying fine:', error);
    res.status(500).json({ error: error.message || 'Failed to pay fine.' });
  }
});

module.exports = router;
