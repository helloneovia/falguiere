const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Mailjet = require('node-mailjet');
const stripe = require('stripe');

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
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'actif',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS newsletters (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'brouillon',
        sent_at TIMESTAMP,
        stats TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounting (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        cash_amount DECIMAL(10,2) DEFAULT 0,
        card_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        image VARCHAR(255),
        rating_sum INT DEFAULT 0,
        rating_count INT DEFAULT 0,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Ajout des colonnes si elles n'existent pas
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS image VARCHAR(255);`).catch(e => {});
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS rating_sum INT DEFAULT 0;`).catch(e => {});
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;`).catch(e => {});
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS collected_donations DECIMAL DEFAULT 0;`).catch(e => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        project_id INT REFERENCES projects(id) ON DELETE SET NULL,
        amount DECIMAL NOT NULL,
        payment_intent_id VARCHAR(255) UNIQUE,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS volunteers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        availabilities VARCHAR(255),
        message TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS volunteer_shifts (
        id SERIAL PRIMARY KEY,
        volunteer_name VARCHAR(255) NOT NULL,
        task VARCHAR(255) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table Comptabilité
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounting (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        cash_amount NUMERIC(10, 2) DEFAULT 0,
        card_amount NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    
    await pool.query(
      'INSERT INTO subscribers (name, email, status, date) VALUES ($1, $2, $3, NOW()) ON CONFLICT (email) DO NOTHING',
      [name, email, 'actif']
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

// 2.5 Volunteers
app.post('/api/volunteers', async (req, res) => {
  const { name, email, phone, availabilities, message } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO volunteers (name, email, phone, availabilities, message, date) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [name, email, phone, availabilities, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/volunteers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM volunteers ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/volunteers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query('DELETE FROM volunteers WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2.6 Volunteer Shifts
app.post('/api/shifts', async (req, res) => {
  const { volunteer_name, task, start_time, end_time } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO volunteer_shifts (volunteer_name, task, start_time, end_time, date) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [volunteer_name, task, start_time, end_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/shifts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM volunteer_shifts ORDER BY start_time ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/shifts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query('DELETE FROM volunteer_shifts WHERE id = $1', [id]);
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
  const hiddenKeys = ['mailjet_api_key', 'mailjet_api_secret', 'stripe_secret_key'];
  
  try {
    // Basic upsert logic
    await pool.query('BEGIN');
    for (const key of keys) {
      const value = content[key];
      
      // Prevent wiping out secret keys if the frontend sends an empty string
      if (hiddenKeys.includes(key) && (!value || value.trim() === '')) {
        continue;
      }
      
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

app.post('/api/documents', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const uploadedDocs = [];
    await pool.query('BEGIN');
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const name = (req.files.length === 1 && req.body.name) ? req.body.name : file.originalname;
      const filename = file.filename;
      const size = file.size;
      
      const result = await pool.query(
        'INSERT INTO documents (name, filename, size, date) VALUES ($1, $2, $3, NOW()) RETURNING *',
        [name, filename, size]
      );
      uploadedDocs.push(result.rows[0]);
    }
    
    await pool.query('COMMIT');
    res.status(201).json(uploadedDocs);
  } catch (err) {
    await pool.query('ROLLBACK');
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

app.post('/api/documents/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Aucun ID fourni' });
    }
    
    const docResult = await pool.query('SELECT filename FROM documents WHERE id = ANY($1)', [ids]);
    
    for (const row of docResult.rows) {
      const filePath = path.join(__dirname, 'uploads', row.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await pool.query('DELETE FROM documents WHERE id = ANY($1)', [ids]);
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

app.get('/api/documents/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const docResult = await pool.query('SELECT filename FROM documents WHERE id = $1', [id]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).send('Document introuvable dans la base de données.');
    }
    
    const { filename } = docResult.rows[0];
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Le fichier physique est introuvable sur le serveur.");
    }
    
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur serveur');
  }
});

// --- SUBSCRIBERS ---
app.get('/api/subscribers', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM subscribers ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/subscribers', async (req, res) => {
  try {
    const { email, name } = req.body;
    const result = await pool.query(
      "INSERT INTO subscribers (email, name, status, date) VALUES ($1, $2, 'actif', NOW()) ON CONFLICT (email) DO UPDATE SET status = 'actif', name = EXCLUDED.name RETURNING *",
      [email, name || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/subscribers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM subscribers WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/subscribers/:id/unsubscribe', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE subscribers SET status = 'desabonne' WHERE id = $1", [id]);
    res.status(200).send();
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- NEWSLETTERS ---
app.get('/api/newsletters', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM newsletters ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/newsletters', async (req, res) => {
  try {
    const { subject, content } = req.body;
    const result = await pool.query(
      "INSERT INTO newsletters (subject, content, status, date) VALUES ($1, $2, 'brouillon', NOW()) RETURNING *",
      [subject, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/newsletters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, content } = req.body;
    const result = await pool.query(
      "UPDATE newsletters SET subject = $1, content = $2 WHERE id = $3 RETURNING *",
      [subject, content, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/newsletters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM newsletters WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/newsletters/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { testEmail, selectedEmails } = req.body;
    
    const nlResult = await pool.query("SELECT * FROM newsletters WHERE id = $1", [id]);
    if (nlResult.rows.length === 0) return res.status(404).json({ error: 'Newsletter non trouvée' });
    const newsletter = nlResult.rows[0];

    const cmsResult = await pool.query("SELECT key, value FROM cms_content WHERE key IN ('mailjet_api_key', 'mailjet_api_secret', 'mailjet_sender_email', 'mailjet_sender_name')");
    const settings = {};
    cmsResult.rows.forEach(r => settings[r.key] = r.value);

    if (!settings.mailjet_api_key || !settings.mailjet_api_secret || !settings.mailjet_sender_email) {
      return res.status(400).json({ error: "Clés API Mailjet non configurées dans les paramètres." });
    }

    const mailjet = new Mailjet({ apiKey: settings.mailjet_api_key, apiSecret: settings.mailjet_api_secret });

    let recipients = [];
    if (testEmail) {
      recipients = [{ Email: testEmail, Name: 'Test' }];
    } else if (selectedEmails && selectedEmails.length > 0) {
      const subResult = await pool.query("SELECT email, name FROM subscribers WHERE email = ANY($1)", [selectedEmails]);
      if (subResult.rows.length === 0) return res.status(400).json({ error: "Aucun abonné valide trouvé dans la sélection." });
      recipients = subResult.rows.map(sub => ({ Email: sub.email, Name: sub.name || '' }));
    } else {
      const subResult = await pool.query("SELECT email, name FROM subscribers WHERE status = 'actif'");
      if (subResult.rows.length === 0) return res.status(400).json({ error: "Aucun abonné actif." });
      recipients = subResult.rows.map(sub => ({ Email: sub.email, Name: sub.name || '' }));
    }

    const messages = recipients.map(recipient => ({
      From: {
        Email: settings.mailjet_sender_email,
        Name: settings.mailjet_sender_name || 'Association Falguiere'
      },
      To: [recipient],
      Subject: newsletter.subject,
      HTMLPart: newsletter.content,
      TextPart: newsletter.content.replace(/<[^>]+>/g, ''),
      CustomCampaign: `Falguiere_NL_${newsletter.id}`,
      TrackOpens: "account_default",
      TrackClicks: "account_default"
    }));

    const chunkSize = 50;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);
      await mailjet.post("send", { version: "v3.1" }).request({ Messages: chunk });
    }

    if (!testEmail) {
      await pool.query("UPDATE newsletters SET status = 'envoyé', sent_at = NOW() WHERE id = $1", [id]);
    }

    res.json({ success: true, count: recipients.length });
  } catch (err) {
    console.error(err.message || err);
    res.status(500).json({ error: "Erreur lors de l'envoi Mailjet" });
  }
});

app.get('/api/newsletters/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cmsResult = await pool.query("SELECT key, value FROM cms_content WHERE key IN ('mailjet_api_key', 'mailjet_api_secret')");
    const settings = {};
    cmsResult.rows.forEach(r => settings[r.key] = r.value);

    if (!settings.mailjet_api_key || !settings.mailjet_api_secret) {
      return res.status(400).json({ error: "Clés API manquantes." });
    }

    const mailjet = new Mailjet({ apiKey: settings.mailjet_api_key, apiSecret: settings.mailjet_api_secret });
    const customCampaignName = `Falguiere_NL_${id}`;

    const campaignReq = await mailjet.get('campaign', { version: 'v3' }).request({ CustomCampaign: customCampaignName });
    const campaigns = campaignReq.body.Data;

    let stats = {
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      spamCount: 0,
      unsubscribedCount: 0,
      totalSent: 0
    };

    if (campaigns && campaigns.length > 0) {
      for (const campaign of campaigns) {
        const msgReq = await mailjet.get('message', { version: 'v3' }).request({
          Campaign: campaign.ID,
          ShowSubject: false,
          ShowContactAlt: false
        });

        const messages = msgReq.body.Data || [];
        for (const msg of messages) {
            stats.totalSent++;
            const status = msg.Status.toLowerCase();
            if (status === 'opened') stats.openedCount++;
            if (status === 'clicked') stats.clickedCount++;
            if (status === 'bounced') stats.bouncedCount++;
            if (status === 'spam') stats.spamCount++;
            if (status === 'unsub') stats.unsubscribedCount++;
            if (['sent', 'opened', 'clicked', 'unsub'].includes(status)) stats.deliveredCount++;
        }
      }
    }

    await pool.query("UPDATE newsletters SET stats = $1 WHERE id = $2", [JSON.stringify(stats), id]);

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des stats" });
  }
});

// --- ACCOUNTING ---
app.get('/api/accounting', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounting ORDER BY date DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/accounting', async (req, res) => {
  try {
    const { date, cash_amount, card_amount } = req.body;
    const result = await pool.query(
      `INSERT INTO accounting (date, cash_amount, card_amount, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT (date) DO UPDATE SET cash_amount = EXCLUDED.cash_amount, card_amount = EXCLUDED.card_amount 
       RETURNING *`,
      [date, cash_amount || 0, card_amount || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/accounting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, cash_amount, card_amount } = req.body;
    const result = await pool.query(
      "UPDATE accounting SET date = $1, cash_amount = $2, card_amount = $3 WHERE id = $4 RETURNING *",
      [date, cash_amount || 0, card_amount || 0, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/accounting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM accounting WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- STRIPE & DONATIONS ---
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, projectId, projectName } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Montant invalide" });

    // Fetch Stripe secret key from DB
    const cmsResult = await pool.query("SELECT value FROM cms_content WHERE key = 'stripe_secret_key'");
    if (cmsResult.rows.length === 0 || !cmsResult.rows[0].value) {
      return res.status(500).json({ error: "Clé API Stripe non configurée." });
    }
    
    const stripeInstance = stripe(cmsResult.rows[0].value);
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amounts in cents
      currency: "eur",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        projectId: projectId || null,
        projectName: projectName || null
      },
      description: projectName ? "Don pour le projet : " + projectName : "Don à l'Association Falguière"
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/donations/verify', async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    if (!payment_intent_id) return res.status(400).json({ error: "Missing payment_intent_id" });

    // Fetch Stripe secret key
    const cmsResult = await pool.query("SELECT value FROM cms_content WHERE key = 'stripe_secret_key'");
    if (cmsResult.rows.length === 0 || !cmsResult.rows[0].value) {
      return res.status(500).json({ error: "Stripe non configuré." });
    }
    const stripeInstance = stripe(cmsResult.rows[0].value);
    
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status === 'succeeded') {
      const amount = paymentIntent.amount / 100;
      const projectId = paymentIntent.metadata.projectId;
      
      // Insert into donations (ignore if already exists due to UNIQUE constraint)
      const insertResult = await pool.query(
        "INSERT INTO donations (project_id, amount, payment_intent_id) VALUES ($1, $2, $3) ON CONFLICT (payment_intent_id) DO NOTHING RETURNING id",
        [projectId || null, amount, payment_intent_id]
      );
      
      // If newly inserted and has projectId, update project collected_donations
      if (insertResult.rowCount > 0 && projectId) {
        await pool.query("UPDATE projects SET collected_donations = collected_donations + $1 WHERE id = $2", [amount, projectId]);
      }
      
      res.json({ success: true, amount, projectId });
    } else {
      res.status(400).json({ error: "Payment not succeeded" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { tier, projectId, projectName } = req.body;
    
    // Fetch Stripe secret key
    const cmsResult = await pool.query("SELECT value FROM cms_content WHERE key = 'stripe_secret_key'");
    if (cmsResult.rows.length === 0 || !cmsResult.rows[0].value) {
      return res.status(500).json({ error: "Stripe non configuré." });
    }
    const stripeInstance = stripe(cmsResult.rows[0].value);
    
    let amount = 0;
    let name = '';
    let collectShipping = false;
    
    if (tier === 'bienfaiteur') {
        amount = 5;
        name = 'Membre Bienfaiteur (Mensuel)';
    } else if (tier === 'honneur') {
        amount = 20;
        name = "Membre d'Honneur (Mensuel) - T-Shirt inclus";
        collectShipping = true;
    } else if (tier === 'mecene') {
        amount = 100;
        name = 'Grand Mécène (Mensuel)';
    } else {
        return res.status(400).json({ error: 'Palier invalide' });
    }
    
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: name,
            description: projectName ? "Soutien pour : " + projectName : "Soutien à l'Association Falguière",
          },
          unit_amount: amount * 100,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }],
      success_url: req.headers.origin + '/don.html?session_id={CHECKOUT_SESSION_ID}&success=true',
      cancel_url: req.headers.origin + '/don.html',
      metadata: {
        tier: tier,
        projectId: projectId || null,
        projectName: projectName || null
      }
    };
    
    if (collectShipping) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['FR', 'BE', 'CH', 'LU'],
      };
      sessionConfig.custom_fields = [
        {
          key: 'tshirt_size',
          label: {
            type: 'custom',
            custom: 'Taille de T-Shirt (S, M, L, XL)',
          },
          type: 'text',
          optional: false,
        }
      ];
    }
    
    const session = await stripeInstance.checkout.sessions.create(sessionConfig);
    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- PROJECTS ---
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM projects ORDER BY date DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/projects', upload.single('image'), async (req, res) => {
  try {
    const { name, email, title, description } = req.body;
    let imageUrl = null;
    if (req.file) {
      imageUrl = '/uploads/' + req.file.filename;
    }
    const result = await pool.query(
      "INSERT INTO projects (name, email, title, description, image, date) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *",
      [name, email, title, description, imageUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/projects/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Note invalide (doit être entre 1 et 5)' });
    }

    const result = await pool.query(
      "UPDATE projects SET rating_sum = rating_sum + $1, rating_count = rating_count + 1 WHERE id = $2 RETURNING *",
      [rating, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM projects WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// === ROUTES COMPTABILITÉ ===
app.get('/api/accounting', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM accounting ORDER BY date DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/accounting', async (req, res) => {
  try {
    const { date, cash_amount, card_amount } = req.body;
    const result = await pool.query(
      `INSERT INTO accounting (date, cash_amount, card_amount) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (date) DO UPDATE SET cash_amount = EXCLUDED.cash_amount, card_amount = EXCLUDED.card_amount 
       RETURNING *`,
      [date, cash_amount, card_amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/accounting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, cash_amount, card_amount } = req.body;
    const result = await pool.query(
      "UPDATE accounting SET date = $1, cash_amount = $2, card_amount = $3 WHERE id = $4 RETURNING *",
      [date, cash_amount, card_amount, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/accounting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM accounting WHERE id = $1", [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback to serve index.html for unknown routes (SPA like behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
