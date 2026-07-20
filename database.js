const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./library.db');

db.serialize(() => {
  // Users table (for login/register + admin role)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      matric_number TEXT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user'
    )
  `);

  // Books table
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      genre TEXT,
      copies INTEGER DEFAULT 1,
      available INTEGER DEFAULT 1
    )
  `);

  // Borrowing records table
  db.run(`
    CREATE TABLE IF NOT EXISTS borrow_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      borrow_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      return_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (book_id) REFERENCES books(id)
    )
  `);

  // Create a default admin account if none exists (email: admin@library.com / password: admin123)
  db.get(`SELECT * FROM users WHERE role = 'admin'`, (err, row) => {
    if (!row) {
      const hashed = bcrypt.hashSync('admin123', 10);
      db.run(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        ['Administrator', 'admin@library.com', hashed, 'admin']
      );
      console.log('Default admin created: admin@library.com / admin123');
    }
  });
});

module.exports = db;