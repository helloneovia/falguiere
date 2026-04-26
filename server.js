const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files from current directory

// Database Connection
// Uses process.env.DATABASE_URL if available, otherwise falls back to the provided internal Dokploy URL
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:oloh9tvwmfm0a37z@falguiere-db-lxcfce:5432/postgres';

const pool = new Pool({
  connectionString,
  // We don't enforce SSL here because Dokploy internal networking usually doesn't require it, 
  // but if needed in the future, add ssl: { rejectUnauthorized: false }
});

// Initialize Database Tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS adhesions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_content (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Error initializing database tables:', err);
  }
}

initDB();

// --- API ROUTES ---

// 1. Adhesions
app.post('/api/adhesions', async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO adhesions (name, email, phone, date) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [name, email, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/adhesions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM adhesions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/adhesions', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE adhesions');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Messages
app.post('/api/messages', async (req, res) => {
  const { name, email, message } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO messages (name, email, message, date) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [name, email, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/messages', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE messages');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. CMS Content
app.get('/api/cms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cms_content');
    const content = {};
    result.rows.forEach(row => {
      content[row.key] = row.value;
    });
    res.json(content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/cms', async (req, res) => {
  const content = req.body;
  const keys = Object.keys(content);
  
  try {
    // Basic upsert logic
    await pool.query('BEGIN');
    for (const key of keys) {
      const value = content[key];
      await pool.query(
        `INSERT INTO cms_content (key, value) VALUES ($1, $2) 
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    }
    await pool.query('COMMIT');
    res.json({ message: 'CMS content updated successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Fallback to serve index.html for unknown routes (SPA like behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
