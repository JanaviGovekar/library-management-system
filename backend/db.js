const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'library.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency and durability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 3. Books table
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      publisher TEXT,
      publish_year INTEGER,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      shelf_location TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      department TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_code TEXT UNIQUE NOT NULL,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      status TEXT NOT NULL DEFAULT 'ISSUED',
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Fines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      amount REAL NOT NULL DEFAULT 0.0,
      days_overdue INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      paid_date TEXT,
      payment_method TEXT,
      receipt_no TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default settings if empty
  const defaultSettings = [
    { key: 'library_name', value: 'City Central Metropolitan Library' },
    { key: 'library_email', value: 'admin@library.com' },
    { key: 'library_phone', value: '+1 (800) 555-0199' },
    { key: 'library_address', value: '100 University Boulevard, Tech City, TC 94016' },
    { key: 'borrow_duration_days', value: '14' },
    { key: 'daily_fine_rate', value: '1.50' },
    { key: 'currency_symbol', value: '$' },
    { key: 'max_books_per_student', value: '3' }
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  defaultSettings.forEach(s => insertSetting.run(s.key, s.value));

  // Seed default Admin user
  const adminCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@library.com');
  if (!adminCheck) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('Library Administrator', 'admin@library.com', hashedPassword, 'admin');
  }

  // Check if sample data is needed for books, students, transactions
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  if (bookCount === 0) {
    seedSampleData();
  } else {
    // Refresh overdue statuses & fine calculations upon startup
    refreshOverdueFines();
  }
}

function seedSampleData() {
  console.log('Seeding initial library sample data...');

  // 1. Seed 16 Books across diverse categories
  const books = [
    {
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      isbn: '978-0132350884',
      category: 'Computer Science',
      publisher: 'Prentice Hall',
      publish_year: 2008,
      total_copies: 5,
      available_copies: 4,
      shelf_location: 'CS-A1-04',
      description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.'
    },
    {
      title: 'Introduction to Algorithms (4th Edition)',
      author: 'Thomas H. Cormen, Charles E. Leiserson',
      isbn: '978-0262046305',
      category: 'Computer Science',
      publisher: 'MIT Press',
      publish_year: 2022,
      total_copies: 4,
      available_copies: 2,
      shelf_location: 'CS-B2-01',
      description: 'Comprehensive textbook on modern computer algorithms, analysis, and data structures.'
    },
    {
      title: 'The Pragmatic Programmer: Your Journey To Mastery',
      author: 'David Thomas, Andrew Hunt',
      isbn: '978-0135957059',
      category: 'Computer Science',
      publisher: 'Addison-Wesley',
      publish_year: 2019,
      total_copies: 3,
      available_copies: 2,
      shelf_location: 'CS-A2-12',
      description: 'Straightforward advice for developing career and code habits from modern masters.'
    },
    {
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
      isbn: '978-0201633610',
      category: 'Software Engineering',
      publisher: 'Addison-Wesley',
      publish_year: 1994,
      total_copies: 3,
      available_copies: 1,
      shelf_location: 'SE-C1-08',
      description: 'The iconic Gang of Four guide to classic software architectural and design patterns.'
    },
    {
      title: 'Artificial Intelligence: A Modern Approach',
      author: 'Stuart Russell, Peter Norvig',
      isbn: '978-0134610993',
      category: 'Artificial Intelligence',
      publisher: 'Pearson',
      publish_year: 2020,
      total_copies: 4,
      available_copies: 3,
      shelf_location: 'AI-D1-03',
      description: 'The standard definitive university reference for modern artificial intelligence concepts.'
    },
    {
      title: 'Deep Learning',
      author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
      isbn: '978-0262035613',
      category: 'Artificial Intelligence',
      publisher: 'MIT Press',
      publish_year: 2016,
      total_copies: 3,
      available_copies: 2,
      shelf_location: 'AI-D2-07',
      description: 'Foundational guide to neural network architectures, backprop, and generative modeling.'
    },
    {
      title: 'Database System Concepts (7th Edition)',
      author: 'Abraham Silberschatz, Henry F. Korth',
      isbn: '978-0078022159',
      category: 'Database Systems',
      publisher: 'McGraw-Hill',
      publish_year: 2019,
      total_copies: 4,
      available_copies: 3,
      shelf_location: 'DB-E1-05',
      description: 'The hallmark textbook presenting fundamental concepts of relational and distributed databases.'
    },
    {
      title: 'Computer Networking: A Top-Down Approach',
      author: 'James F. Kurose, Keith W. Ross',
      isbn: '978-0136681557',
      category: 'Networking',
      publisher: 'Pearson',
      publish_year: 2021,
      total_copies: 3,
      available_copies: 2,
      shelf_location: 'NET-F1-02',
      description: 'A top-down perspective on the internet architecture, application protocols, and transport.'
    },
    {
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '978-0060935467',
      category: 'Literature & Fiction',
      publisher: 'Harper Perennial',
      publish_year: 2002,
      total_copies: 5,
      available_copies: 4,
      shelf_location: 'LIT-G2-14',
      description: 'A masterpiece of American literature exploring honor, injustice, and human compassion.'
    },
    {
      title: '1984',
      author: 'George Orwell',
      isbn: '978-0451524935',
      category: 'Literature & Fiction',
      publisher: 'Signet Classic',
      publish_year: 1950,
      total_copies: 6,
      available_copies: 5,
      shelf_location: 'LIT-G2-19',
      description: 'The dystopian classic warning about totalitarian surveillance, propaganda, and state control.'
    },
    {
      title: 'A Brief History of Time',
      author: 'Stephen Hawking',
      isbn: '978-0553380163',
      category: 'Physics & Science',
      publisher: 'Bantam',
      publish_year: 1998,
      total_copies: 4,
      available_copies: 3,
      shelf_location: 'SCI-H1-10',
      description: 'A landmark cosmological journey through black holes, quantum physics, and cosmic origins.'
    },
    {
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      isbn: '978-0062316097',
      category: 'History & Anthropology',
      publisher: 'Harper',
      publish_year: 2015,
      total_copies: 5,
      available_copies: 4,
      shelf_location: 'HIST-J3-09',
      description: 'How an insignificant ape became the ruler of planet Earth, told with vivid clarity.'
    },
    {
      title: 'Calculus: Early Transcendentals (9th Edition)',
      author: 'James Stewart',
      isbn: '978-1337613927',
      category: 'Mathematics',
      publisher: 'Cengage Learning',
      publish_year: 2020,
      total_copies: 4,
      available_copies: 3,
      shelf_location: 'MATH-K1-04',
      description: 'Clear, accurate, and filled with real-world applications of differential and integral calculus.'
    },
    {
      title: 'Operating System Concepts',
      author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne',
      isbn: '978-1119800361',
      category: 'Computer Science',
      publisher: 'Wiley',
      publish_year: 2021,
      total_copies: 3,
      available_copies: 2,
      shelf_location: 'CS-B1-06',
      description: 'The famous dinosaur book exploring virtual memory, process scheduling, concurrency, and security.'
    },
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '978-0743273565',
      category: 'Literature & Fiction',
      publisher: 'Scribner',
      publish_year: 2004,
      total_copies: 4,
      available_copies: 4,
      shelf_location: 'LIT-G1-02',
      description: 'The quintessential novel of the Jazz Age, wealth, ambition, and the illusion of the American Dream.'
    },
    {
      title: 'Thinking, Fast and Slow',
      author: 'Daniel Kahneman',
      isbn: '978-0374533557',
      category: 'Psychology',
      publisher: 'Farrar, Straus and Giroux',
      publish_year: 2013,
      total_copies: 3,
      available_copies: 3,
      shelf_location: 'PSY-L2-01',
      description: 'The behavioral economist\'s seminal work outlining two modes of cognitive thought: fast instinct vs deliberate calculation.'
    }
  ];

  const insertBook = db.prepare(`
    INSERT INTO books (title, author, isbn, category, publisher, publish_year, total_copies, available_copies, shelf_location, description)
    VALUES (@title, @author, @isbn, @category, @publisher, @publish_year, @total_copies, @available_copies, @shelf_location, @description)
  `);

  books.forEach(b => insertBook.run(b));

  // 2. Seed 11 Students
  const students = [
    { student_id: 'STU-2024-001', name: 'Alex Johnson', email: 'alex.j@campus.edu', phone: '(555) 123-4567', department: 'Computer Science', academic_year: '3rd Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-002', name: 'Sophia Martinez', email: 'sophia.m@campus.edu', phone: '(555) 234-5678', department: 'Data Science', academic_year: '2nd Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-003', name: 'Ethan Williams', email: 'ethan.w@campus.edu', phone: '(555) 345-6789', department: 'Electrical Engineering', academic_year: '4th Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-004', name: 'Olivia Brown', email: 'olivia.b@campus.edu', phone: '(555) 456-7890', department: 'Information Technology', academic_year: '1st Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-005', name: 'Liam Davis', email: 'liam.d@campus.edu', phone: '(555) 567-8901', department: 'Computer Science', academic_year: '4th Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-006', name: 'Emma Wilson', email: 'emma.w@campus.edu', phone: '(555) 678-9012', department: 'Mechanical Engineering', academic_year: '2nd Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-007', name: 'Noah Miller', email: 'noah.m@campus.edu', phone: '(555) 789-0123', department: 'Mathematics', academic_year: '3rd Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-008', name: 'Ava Taylor', email: 'ava.t@campus.edu', phone: '(555) 890-1234', department: 'Literature & Arts', academic_year: '1st Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-009', name: 'Lucas Anderson', email: 'lucas.a@campus.edu', phone: '(555) 901-2345', department: 'Artificial Intelligence', academic_year: 'Master 1st Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-010', name: 'Isabella Thomas', email: 'isabella.t@campus.edu', phone: '(555) 012-3456', department: 'Physics', academic_year: '4th Year', status: 'ACTIVE' },
    { student_id: 'STU-2024-011', name: 'Mason Jackson', email: 'mason.j@campus.edu', phone: '(555) 111-2233', department: 'Economics & Management', academic_year: '2nd Year', status: 'SUSPENDED' }
  ];

  const insertStudent = db.prepare(`
    INSERT INTO students (student_id, name, email, phone, department, academic_year, status)
    VALUES (@student_id, @name, @email, @phone, @department, @academic_year, @status)
  `);

  students.forEach(s => insertStudent.run(s));

  // 3. Seed 16 Transactions (Mix of RETURNED on time, RETURNED with late fine, ISSUED active, and OVERDUE)
  // Let's compute dates relative to current date (e.g. today)
  const now = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];

  const daysAgo = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return formatDate(d);
  };

  const daysAhead = (days) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  };

  const transactionsData = [
    // Returned on time (no fines)
    { code: 'TXN-8801', bookId: 1, stuId: 1, issue: daysAgo(30), due: daysAgo(16), ret: daysAgo(17), status: 'RETURNED', remarks: 'Returned in good condition' },
    { code: 'TXN-8802', bookId: 3, stuId: 2, issue: daysAgo(28), due: daysAgo(14), ret: daysAgo(15), status: 'RETURNED', remarks: 'Returned on time' },
    { code: 'TXN-8803', bookId: 7, stuId: 4, issue: daysAgo(25), due: daysAgo(11), ret: daysAgo(12), status: 'RETURNED', remarks: 'First borrowing experience' },
    { code: 'TXN-8804', bookId: 9, stuId: 8, issue: daysAgo(22), due: daysAgo(8), ret: daysAgo(9), status: 'RETURNED', remarks: 'Returned early' },
    { code: 'TXN-8805', bookId: 10, stuId: 5, issue: daysAgo(20), due: daysAgo(6), ret: daysAgo(6), status: 'RETURNED', remarks: 'Returned exactly on due date' },

    // Returned late with fine paid
    { code: 'TXN-8806', bookId: 2, stuId: 3, issue: daysAgo(35), due: daysAgo(21), ret: daysAgo(15), status: 'RETURNED', remarks: 'Late return by 6 days' },
    { code: 'TXN-8807', bookId: 5, stuId: 9, issue: daysAgo(40), due: daysAgo(26), ret: daysAgo(22), status: 'RETURNED', remarks: 'Late return by 4 days' },

    // Returned late with fine UNPAID
    { code: 'TXN-8808', bookId: 4, stuId: 7, issue: daysAgo(32), due: daysAgo(18), ret: daysAgo(10), status: 'RETURNED', remarks: 'Returned 8 days late, fine pending' },

    // Currently Issued (Active, not overdue yet)
    { code: 'TXN-8809', bookId: 1, stuId: 6, issue: daysAgo(6), due: daysAhead(8), ret: null, status: 'ISSUED', remarks: 'Midterm study' },
    { code: 'TXN-8810', bookId: 2, stuId: 1, issue: daysAgo(4), due: daysAhead(10), ret: null, status: 'ISSUED', remarks: 'Algorithm project reference' },
    { code: 'TXN-8811', bookId: 3, stuId: 5, issue: daysAgo(2), due: daysAhead(12), ret: null, status: 'ISSUED', remarks: 'Software lab reference' },
    { code: 'TXN-8812', bookId: 8, stuId: 3, issue: daysAgo(5), due: daysAhead(9), ret: null, status: 'ISSUED', remarks: 'Network lab work' },
    { code: 'TXN-8813', bookId: 12, stuId: 10, issue: daysAgo(7), due: daysAhead(7), ret: null, status: 'ISSUED', remarks: 'General reading' },

    // Currently Overdue (Issue date > 14 days ago, due date in the past, no return)
    { code: 'TXN-8814', bookId: 2, stuId: 2, issue: daysAgo(22), due: daysAgo(8), ret: null, status: 'OVERDUE', remarks: 'Reminder email sent' },
    { code: 'TXN-8815', bookId: 4, stuId: 7, issue: daysAgo(25), due: daysAgo(11), ret: null, status: 'OVERDUE', remarks: 'Overdue by 11 days' },
    { code: 'TXN-8816', bookId: 6, stuId: 9, issue: daysAgo(19), due: daysAgo(5), ret: null, status: 'OVERDUE', remarks: 'Second notice issued' },
    { code: 'TXN-8817', bookId: 11, stuId: 4, issue: daysAgo(18), due: daysAgo(4), ret: null, status: 'OVERDUE', remarks: 'Student promised return tomorrow' }
  ];

  const insertTxn = db.prepare(`
    INSERT INTO transactions (transaction_code, book_id, student_id, issue_date, due_date, return_date, status, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFine = db.prepare(`
    INSERT INTO fines (transaction_id, student_id, amount, days_overdue, status, paid_date, payment_method, receipt_no, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  transactionsData.forEach((t) => {
    const res = insertTxn.run(t.code, t.bookId, t.stuId, t.issue, t.due, t.ret, t.status, t.remarks);
    const txnId = res.lastInsertRowid;

    // Fines for returned late
    if (t.code === 'TXN-8806') {
      // 6 days * $1.50 = $9.00 PAID
      insertFine.run(txnId, t.stuId, 9.00, 6, 'PAID', daysAgo(15), 'Credit Card', 'REC-2024-001', 'Settled upon return at front desk');
    } else if (t.code === 'TXN-8807') {
      // 4 days * $1.50 = $6.00 PAID
      insertFine.run(txnId, t.stuId, 6.00, 4, 'PAID', daysAgo(22), 'Cash', 'REC-2024-002', 'Paid in exact cash');
    } else if (t.code === 'TXN-8808') {
      // 8 days * $1.50 = $12.00 UNPAID
      insertFine.run(txnId, t.stuId, 12.00, 8, 'UNPAID', null, null, null, 'Student requested payment extension');
    } else if (t.status === 'OVERDUE') {
      // Active overdue books have automatic calculated pending fines
      const dueObj = new Date(t.due);
      const diffTime = Math.max(0, now - dueObj);
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const amount = parseFloat((daysOverdue * 1.50).toFixed(2));

      insertFine.run(txnId, t.stuId, amount, daysOverdue, 'UNPAID', null, null, null, `Auto-calculated fine (${daysOverdue} days overdue)`);
    }
  });

  // Re-sync available copies based on currently active (ISSUED / OVERDUE) transactions
  syncBookAvailability();
  console.log('Sample data seeding completed successfully.');
}

function syncBookAvailability() {
  const books = db.prepare('SELECT id, total_copies FROM books').all();
  const countIssuedStmt = db.prepare(`
    SELECT COUNT(*) as count FROM transactions 
    WHERE book_id = ? AND status IN ('ISSUED', 'OVERDUE')
  `);
  const updateCopiesStmt = db.prepare(`
    UPDATE books SET available_copies = ? WHERE id = ?
  `);

  for (const b of books) {
    const issuedCount = countIssuedStmt.get(b.id).count;
    const available = Math.max(0, b.total_copies - issuedCount);
    updateCopiesStmt.run(available, b.id);
  }
}

function refreshOverdueFines() {
  const todayStr = new Date().toISOString().split('T')[0];
  const rateSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_fine_rate');
  const dailyRate = rateSetting ? parseFloat(rateSetting.value) || 1.5 : 1.5;

  // Mark transactions as OVERDUE if due_date < today and status is ISSUED
  const overdueTxns = db.prepare(`
    SELECT id, student_id, due_date FROM transactions
    WHERE status = 'ISSUED' AND due_date < ?
  `).all(todayStr);

  const updateTxnStatus = db.prepare(`
    UPDATE transactions SET status = 'OVERDUE' WHERE id = ?
  `);

  const upsertFine = db.prepare(`
    INSERT INTO fines (transaction_id, student_id, amount, days_overdue, status, notes)
    VALUES (?, ?, ?, ?, 'UNPAID', 'Automated overdue fine')
    ON CONFLICT(transaction_id) DO UPDATE SET
      amount = excluded.amount,
      days_overdue = excluded.days_overdue
    WHERE fines.status = 'UNPAID'
  `);

  const now = new Date();
  for (const txn of overdueTxns) {
    updateTxnStatus.run(txn.id);
    const dueDate = new Date(txn.due_date);
    const diffTime = Math.max(0, now - dueDate);
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const amount = parseFloat((daysOverdue * dailyRate).toFixed(2));
    upsertFine.run(txn.id, txn.student_id, amount, daysOverdue);
  }
}

module.exports = {
  db,
  initDatabase,
  syncBookAvailability,
  refreshOverdueFines
};
