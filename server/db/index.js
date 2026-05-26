require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// In production use /data/safebox.db — mount a Railway Volume at /data to persist across deploys.
// Override at any time with the DB_PATH environment variable.
const DB_PATH = process.env.DB_PATH ||
  (process.env.NODE_ENV === 'production' ? '/data/safebox.db' : './server/db/safebox.db');
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply full schema on every startup (CREATE TABLE IF NOT EXISTS — safe on existing DBs)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Column migrations — ALTER TABLE is safe to attempt; the catch ignores "duplicate column" errors
const migrations = [
  "ALTER TABLE projects ADD COLUMN sale_type TEXT NOT NULL DEFAULT 'Outright Purchase'",
  "ALTER TABLE projects ADD COLUMN system_size_kva REAL DEFAULT 0",
  "ALTER TABLE stock_movements ADD COLUMN condition TEXT NOT NULL DEFAULT 'New'",
];
for (const sql of migrations) {
  try { db.prepare(sql).run(); } catch (_) { /* column already exists — skip */ }
}

module.exports = db;
