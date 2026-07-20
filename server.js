const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'library-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 } // 2 hour session
}));

// Helper: require login
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// Helper: require admin
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
}

// ---------- AUTH ROUTES ----------

// Register
app.post('/api/register', (req, res) => {
  const { name, matric_number, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  db.run(
    `INSERT INTO users (name, matric_number, email, phone, password) VALUES (?, ?, ?, ?, ?)`,
    [name, matric_number, email, phone, hashed],
    function (err) {
      if (err) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      res.json({ success: true, message: 'Registered successfully' });
    }
  );
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      matric_number: user.matric_number,
      role: user.role
    };
    res.json({ success: true, user: req.session.user });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Check current session (useful for dashboard.html to know who's logged in)
app.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: req.session.user });
});

// ---------- BOOK ROUTES ----------

// Get all books (catalog)
app.get('/api/books', (req, res) => {
  db.all(`SELECT * FROM books`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Add a book (admin only)
app.post('/api/books', requireAdmin, (req, res) => {
  const { title, author, genre, copies } = req.body;
  db.run(
    `INSERT INTO books (title, author, genre, copies, available) VALUES (?, ?, ?, ?, ?)`,
    [title, author, genre, copies || 1, copies || 1],
    function (err) {
      if (err) return res.status(500).json({ error: 'Could not add book' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Delete a book (admin only)
app.delete('/api/books/:id', requireAdmin, (req, res) => {
  db.run(`DELETE FROM books WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Could not delete book' });
    res.json({ success: true });
  });
});

// Public stats (no sensitive data) — used on the homepage
app.get('/api/stats', (req, res) => {
  db.get(`SELECT COUNT(*) AS total FROM books`, (err, bookRow) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    db.get(`SELECT COUNT(*) AS total FROM users WHERE role != 'admin'`, (err2, userRow) => {
      if (err2) return res.status(500).json({ error: 'Database error' });
      res.json({ totalBooks: bookRow.total, totalMembers: userRow.total });
    });
  });
});

// ---------- BORROWING ROUTES ----------

// Borrow a book (logged-in users)
app.post('/api/borrow', requireLogin, (req, res) => {
  const { book_id } = req.body;
  const userId = req.session.user.id;

  db.get(`SELECT * FROM books WHERE id = ?`, [book_id], (err, book) => {
    if (!book || book.available < 1) {
      return res.status(400).json({ error: 'Book not available' });
    }

    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(borrowDate.getDate() + 14); // 2 week loan

    db.run(
      `INSERT INTO borrow_records (user_id, book_id, borrow_date, due_date) VALUES (?, ?, ?, ?)`,
      [userId, book_id, borrowDate.toISOString(), dueDate.toISOString()],
      function (err) {
        if (err) return res.status(500).json({ error: 'Could not borrow book' });
        db.run(`UPDATE books SET available = available - 1 WHERE id = ?`, [book_id]);
        res.json({ success: true, due_date: dueDate.toISOString() });
      }
    );
  });
});

// Return a book
app.post('/api/return', requireLogin, (req, res) => {
  const { record_id, book_id } = req.body;

  db.run(
    `UPDATE borrow_records SET return_date = ? WHERE id = ?`,
    [new Date().toISOString(), record_id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Could not return book' });
      db.run(`UPDATE books SET available = available + 1 WHERE id = ?`, [book_id]);
      res.json({ success: true });
    }
  );
});

// Get logged-in user's currently borrowed books
app.get('/api/my-borrows', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  db.all(
    `SELECT borrow_records.*, books.title, books.author
     FROM borrow_records
     JOIN books ON borrow_records.book_id = books.id
     WHERE borrow_records.user_id = ? AND borrow_records.return_date IS NULL`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Get logged-in user's full borrow history (for dashboard stats)
app.get('/api/my-borrows/history', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  db.all(
    `SELECT borrow_records.*, books.title, books.author
     FROM borrow_records
     JOIN books ON borrow_records.book_id = books.id
     WHERE borrow_records.user_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Get all borrow records with user + book info (admin only)
app.get('/api/admin/borrow-records', requireAdmin, (req, res) => {
  db.all(
    `SELECT borrow_records.*, users.name AS user_name, books.title AS book_title
     FROM borrow_records
     JOIN users ON borrow_records.user_id = users.id
     JOIN books ON borrow_records.book_id = books.id
     ORDER BY borrow_records.borrow_date DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Get all users (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
  db.all(`SELECT id, name, email, role FROM users`, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`Library server running at http://localhost:${PORT}`);
});