const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./db');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const studentRoutes = require('./routes/students');
const transactionRoutes = require('./routes/transactions');
const fineRoutes = require('./routes/fines');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Database (Tables, default admin & seed data)
initDatabase();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Library Management System API'
  });
});

// Serve Frontend static assets if built
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA fallback for non-API routes (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
}

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'An unexpected internal server error occurred.',
    details: err.message
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Library Management System Backend Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔑 Default Admin Credentials: admin@library.com / admin123`);
  console.log(`====================================================`);
});
