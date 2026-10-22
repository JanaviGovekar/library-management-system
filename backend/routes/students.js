const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/students - List all students with search and summary counts
router.get('/', (req, res) => {
  try {
    const { search, status, department } = req.query;

    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM transactions t WHERE t.student_id = s.id AND t.status IN ('ISSUED', 'OVERDUE')) as active_borrowings,
        (SELECT COALESCE(SUM(f.amount), 0) FROM fines f WHERE f.student_id = s.id AND f.status = 'UNPAID') as unpaid_fines_total
      FROM students s
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ` AND (s.name LIKE ? OR s.student_id LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)`;
      params.push(term, term, term, term);
    }

    if (status && status !== 'All') {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (department && department !== 'All') {
      query += ` AND s.department = ?`;
      params.push(department);
    }

    query += ` ORDER BY s.name ASC`;

    const students = db.prepare(query).all(...params);
    res.json({ students, total: students.length });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to retrieve students.' });
  }
});

// GET /api/students/departments - Distinct departments
router.get('/departments', (req, res) => {
  try {
    const depts = db.prepare('SELECT DISTINCT department FROM students ORDER BY department ASC').all();
    res.json(depts.map(d => d.department));
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve departments.' });
  }
});

// GET /api/students/:id - Get student details, borrowing history, and fines
router.get('/:id', (req, res) => {
  try {
    const student = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM transactions t WHERE t.student_id = s.id AND t.status IN ('ISSUED', 'OVERDUE')) as active_borrowings,
        (SELECT COALESCE(SUM(f.amount), 0) FROM fines f WHERE f.student_id = s.id AND f.status = 'UNPAID') as unpaid_fines_total
      FROM students s
      WHERE s.id = ?
    `).get(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const borrowings = db.prepare(`
      SELECT t.*, b.title as book_title, b.author as book_author, b.isbn as book_isbn,
        f.amount as fine_amount, f.status as fine_status
      FROM transactions t
      JOIN books b ON t.book_id = b.id
      LEFT JOIN fines f ON f.transaction_id = t.id
      WHERE t.student_id = ?
      ORDER BY t.issue_date DESC
    `).all(req.params.id);

    const fines = db.prepare(`
      SELECT f.*, t.transaction_code, b.title as book_title
      FROM fines f
      JOIN transactions t ON f.transaction_id = t.id
      JOIN books b ON t.book_id = b.id
      WHERE f.student_id = ?
      ORDER BY f.created_at DESC
    `).all(req.params.id);

    res.json({ student, borrowings, fines });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: 'Failed to retrieve student details.' });
  }
});

// POST /api/students - Register student
router.post('/', authenticateToken, (req, res) => {
  try {
    const { student_id, name, email, phone, department, academic_year, status } = req.body;

    if (!student_id || !name || !email || !phone || !department || !academic_year) {
      return res.status(400).json({ error: 'Please provide all required student details.' });
    }

    // Check duplicate student_id or email
    const existingId = db.prepare('SELECT id FROM students WHERE student_id = ?').get(student_id.trim());
    if (existingId) {
      return res.status(400).json({ error: 'A student with this Student ID already exists.' });
    }

    const existingEmail = db.prepare('SELECT id FROM students WHERE email = ?').get(email.trim().toLowerCase());
    if (existingEmail) {
      return res.status(400).json({ error: 'A student with this email address already exists.' });
    }

    const stmt = db.prepare(`
      INSERT INTO students (student_id, name, email, phone, department, academic_year, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      student_id.trim().toUpperCase(),
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      department.trim(),
      academic_year.trim(),
      status || 'ACTIVE'
    );

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Student registered successfully', student: newStudent });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ error: error.message || 'Failed to register student.' });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const studentId = req.params.id;
    const { student_code, name, email, phone, department, academic_year, status } = req.body;

    const currentStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!currentStudent) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Check unique email conflict
    if (email && email.trim().toLowerCase() !== currentStudent.email) {
      const conflict = db.prepare('SELECT id FROM students WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), studentId);
      if (conflict) {
        return res.status(400).json({ error: 'Another student already has this email.' });
      }
    }

    db.prepare(`
      UPDATE students SET
        student_id = ?,
        name = ?,
        email = ?,
        phone = ?,
        department = ?,
        academic_year = ?,
        status = ?
      WHERE id = ?
    `).run(
      student_code ? student_code.trim().toUpperCase() : currentStudent.student_id,
      name ? name.trim() : currentStudent.name,
      email ? email.trim().toLowerCase() : currentStudent.email,
      phone ? phone.trim() : currentStudent.phone,
      department ? department.trim() : currentStudent.department,
      academic_year ? academic_year.trim() : currentStudent.academic_year,
      status || currentStudent.status,
      studentId
    );

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    res.json({ message: 'Student updated successfully', student: updated });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: error.message || 'Failed to update student.' });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const studentId = req.params.id;
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const activeBorrowings = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      WHERE student_id = ? AND status IN ('ISSUED', 'OVERDUE')
    `).get(studentId).count;

    if (activeBorrowings > 0) {
      return res.status(400).json({
        error: `Cannot delete student who has ${activeBorrowings} active or overdue book(s). Please return all books first.`
      });
    }

    const unpaidFines = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM fines 
      WHERE student_id = ? AND status = 'UNPAID'
    `).get(studentId).total;

    if (unpaidFines > 0) {
      return res.status(400).json({
        error: `Cannot delete student who has unpaid fines amounting to $${unpaidFines.toFixed(2)}. Please settle fines first.`
      });
    }

    db.prepare('DELETE FROM fines WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM transactions WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM students WHERE id = ?').run(studentId);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: error.message || 'Failed to delete student.' });
  }
});

module.exports = router;
