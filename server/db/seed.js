require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './server/db/safebox.db';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Always delete existing DB and recreate from scratch
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('🗑️  Existing database deleted. Recreating from scratch...');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const now = new Date().toISOString();

const insertUser = db.prepare(`INSERT INTO users (id,name,email,password_hash,role,status,invited,created_at) VALUES (?,?,?,?,?,?,?,?)`);
const insertCat = db.prepare(`INSERT INTO categories (id,name,created_at) VALUES (?,?,?)`);
const insertSub = db.prepare(`INSERT INTO subcategories (id,category_id,name) VALUES (?,?,?)`);
const insertSetting = db.prepare(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,?)`);
const insertAudit = db.prepare(`INSERT INTO audit_log (id,timestamp,user_id,user_name,action,entity_type,entity_id,detail) VALUES (?,?,?,?,?,?,?,?)`);

const seed = db.transaction(() => {
  const saId = 'USR-001';
  const hash = bcrypt.hashSync('Ebuka123@', 10);

  // Only one user: Super Admin
  insertUser.run(saId, 'Ebuka Azubuike', 'ebuka@safebox.ng', hash, 'Super Admin', 'Active', 0, now);

  // All 8 categories with subcategories
  const cats = [
    ['CAT-001', 'Battery'],
    ['CAT-002', 'Solar Panel'],
    ['CAT-003', 'Inverter'],
    ['CAT-004', 'Cable'],
    ['CAT-005', 'Charge Controller'],
    ['CAT-006', 'Mounting'],
    ['CAT-007', 'Protection'],
    ['CAT-008', 'Accessories'],
  ];
  const subs = {
    'CAT-001': ['Lithium (LiFePO4)', 'Lead Acid (AGM)', 'Gel'],
    'CAT-002': ['Monocrystalline', 'Polycrystalline', 'Bifacial', 'Thin Film'],
    'CAT-003': ['Hybrid', 'Off-Grid', 'Grid-Tied', 'Micro'],
    'CAT-004': ['DC Solar Cable', 'AC Cable', 'Battery Cable', 'Earthing Cable'],
    'CAT-005': ['MPPT', 'PWM'],
    'CAT-006': ['Roof Mount', 'Ground Mount', 'Carport Mount'],
    'CAT-007': ['DC MCB', 'AC MCB', 'Surge Protector', 'Fuse'],
    'CAT-008': ['MC4 Connector', 'Cable Tray', 'Junction Box', 'Battery Monitor'],
  };
  cats.forEach(([id, name]) => {
    insertCat.run(id, name, now);
    (subs[id] || []).forEach((s, i) => insertSub.run(`${id}-S${i + 1}`, id, s));
  });

  // Settings
  const settings = [
    ['currency', 'NGN'],
    ['timezone', 'Africa/Lagos'],
    ['company_name', 'SafeBox Energy'],
    ['company_email', 'info@safebox.ng'],
    ['low_stock_alert', 'true'],
    ['require_approval', 'true'],
  ];
  settings.forEach(([k, v]) => insertSetting.run(k, v, now));

  // Initial audit entry
  insertAudit.run(uuidv4(), now, saId, 'Ebuka Azubuike', 'Database seeded', 'system', 'all', 'Fresh database initialized for SafeBox Energy IMS');
});

seed();
console.log('✅ Database seeded successfully.');
console.log('📧 Login: ebuka@safebox.ng / Ebuka123@');
db.close();
