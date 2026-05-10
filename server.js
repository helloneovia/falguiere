const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files from current directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploads directory

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Replace spaces with underscores and add a timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage: storage });

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
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        size INTEGER,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

// 4. Documents
app.get('/api/documents', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    const name = req.body.name || req.file.originalname;
    const filename = req.file.filename;
    const size = req.file.size;
    
    const result = await pool.query(
      'INSERT INTO documents (name, filename, size, date) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [name, filename, size]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const docResult = await pool.query('SELECT filename FROM documents WHERE id = $1', [id]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }
    
    const filename = docResult.rows[0].filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/documents/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const docResult = await pool.query('SELECT filename, name FROM documents WHERE id = $1', [id]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).send('Document introuvable dans la base de données.');
    }
    
    const { filename, name } = docResult.rows[0];
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Le fichier physique est introuvable sur le serveur. Il a probablement été perdu lors d'un redéploiement (absence de volume persistant).");
    }
    
    // Send file and force download with the original name
    res.download(filePath, name);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
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
