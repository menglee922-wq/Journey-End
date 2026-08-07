const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new Database(path.join(__dirname, 'lifequest.db'));

// Create table for all data records (flexible schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Helper: parse record from DB
function parseRecord(row) {
  const data = JSON.parse(row.data);
  data.__backendId = row.id.toString();
  return data;
}

// Helper: get all records
function getAllRecords() {
  const rows = db.prepare('SELECT * FROM records ORDER BY id').all();
  return rows.map(parseRecord);
}

// API: Get all data
app.get('/api/data', (req, res) => {
  try {
    const records = getAllRecords();
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('Error getting data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Create new record
app.post('/api/data', (req, res) => {
  try {
    const recordData = req.body;
    // Remove __backendId if present (new record)
    delete recordData.__backendId;
    
    const stmt = db.prepare('INSERT INTO records (data) VALUES (?)');
    const result = stmt.run(JSON.stringify(recordData));
    
    const newRow = db.prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid);
    const newRecord = parseRecord(newRow);
    
    res.json({ success: true, isOk: true, record: newRecord });
  } catch (err) {
    console.error('Error creating record:', err);
    res.status(500).json({ success: false, isOk: false, error: err.message });
  }
});

// API: Update record
app.put('/api/data/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const recordData = req.body;
    // Remove __backendId from data
    delete recordData.__backendId;
    
    const existing = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, isOk: false, error: 'Record not found' });
    }
    
    db.prepare('UPDATE records SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(recordData), id);
    
    const updatedRow = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
    const updatedRecord = parseRecord(updatedRow);
    
    res.json({ success: true, isOk: true, record: updatedRecord });
  } catch (err) {
    console.error('Error updating record:', err);
    res.status(500).json({ success: false, isOk: false, error: err.message });
  }
});

// API: Delete record
app.delete('/api/data/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    db.prepare('DELETE FROM records WHERE id = ?').run(id);
    res.json({ success: true, isOk: true });
  } catch (err) {
    console.error('Error deleting record:', err);
    res.status(500).json({ success: false, isOk: false, error: err.message });
  }
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   Lifequest Local Server is running!        ║
║                                              ║
║   Website:  http://localhost:${PORT}            ║
║   API:      http://localhost:${PORT}/api/data   ║
║                                              ║
║   Press Ctrl+C to stop the server           ║
╚══════════════════════════════════════════════╝
  `);
});
