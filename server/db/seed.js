require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './server/db/safebox.db';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (existing.c > 0) {
  console.log('✅ Database already seeded. Skipping.');
  process.exit(0);
}

const now = new Date().toISOString();

const insertUser = db.prepare(`INSERT INTO users (id,name,email,password_hash,role,status,invited,created_at) VALUES (?,?,?,?,?,?,?,?)`);
const insertCat = db.prepare(`INSERT INTO categories (id,name,created_at) VALUES (?,?,?)`);
const insertSub = db.prepare(`INSERT INTO subcategories (id,category_id,name) VALUES (?,?,?)`);
const insertProd = db.prepare(`INSERT INTO products (id,category,subcategory,brand,model,unit,min_threshold,max_threshold,unit_cost,status,created_by,approved_by,approved_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insertMv = db.prepare(`INSERT INTO stock_movements (id,date,product_id,movement_type,quantity,source,recorded_by,status,approved_by,approved_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const insertProj = db.prepare(`INSERT INTO projects (id,name,client,project_type,start_date,end_date,status,manager,system_size_kwp,notes,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
const insertMat = db.prepare(`INSERT INTO project_materials (id,date,project_id,product_id,quantity,created_by,created_at) VALUES (?,?,?,?,?,?,?)`);
const insertEng = db.prepare(`INSERT INTO project_engineers (id,project_id,name,role,date_assigned,date_completed,notes,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
const insertReturn = db.prepare(`INSERT INTO returns (id,date,return_type,project_id,product_id,quantity,reason,oem,sent_to_oem_date,oem_response,reconciled,notes,logged_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insertSetting = db.prepare(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,?)`);
const insertAudit = db.prepare(`INSERT INTO audit_log (id,timestamp,user_id,user_name,action,entity_type,entity_id,detail) VALUES (?,?,?,?,?,?,?,?)`);

const seed = db.transaction(() => {
  const hash = bcrypt.hashSync('Admin1234!', 10);
  const saId = 'USR-001', adId = 'USR-002', ad2Id = 'USR-003';

  insertUser.run(saId,'Emeka Adeyemi','superadmin@safebox.ng',hash,'Super Admin','Active',0,now);
  insertUser.run(adId,'Ngozi Okafor','admin@safebox.ng',hash,'Admin','Active',0,now);
  insertUser.run(ad2Id,'Chukwu Eze','chukwu@safebox.ng',hash,'Admin','Active',0,now);
  insertUser.run('USR-004','Pending User','invite@example.com',null,'Admin','Invited',1,now);

  const cats = [
    ['CAT-001','Battery'],['CAT-002','Solar Panel'],['CAT-003','Inverter'],
    ['CAT-004','Cable'],['CAT-005','Charge Controller'],['CAT-006','Mounting'],
    ['CAT-007','Protection'],['CAT-008','Accessories']
  ];
  const subs = {
    'CAT-001':['Lithium (LiFePO4)','Lead Acid (AGM)','Gel'],
    'CAT-002':['Monocrystalline','Polycrystalline','Bifacial','Thin Film'],
    'CAT-003':['Hybrid','Off-Grid','Grid-Tied','Micro'],
    'CAT-004':['DC Solar Cable','AC Cable','Battery Cable','Earthing Cable'],
    'CAT-005':['MPPT','PWM'],
    'CAT-006':['Roof Mount','Ground Mount','Carport Mount'],
    'CAT-007':['DC MCB','AC MCB','Surge Protector','Fuse'],
    'CAT-008':['MC4 Connector','Cable Tray','Junction Box','Battery Monitor']
  };
  cats.forEach(([id,name]) => {
    insertCat.run(id,name,now);
    (subs[id]||[]).forEach((s,i) => insertSub.run(`${id}-S${i+1}`,id,s));
  });

  const prods = [
    ['PRD-001','Battery','Lithium (LiFePO4)','BYD','BYD B-Box 5kWh','Unit',5,30,850000],
    ['PRD-002','Battery','Lithium (LiFePO4)','Pylontech','US3000C 3.5kWh','Unit',5,25,520000],
    ['PRD-003','Battery','Lead Acid (AGM)','Trojan','T-105 6V 225Ah','Unit',10,50,185000],
    ['PRD-004','Solar Panel','Monocrystalline','Jinko','JKM400M 400W','Unit',20,100,145000],
    ['PRD-005','Solar Panel','Monocrystalline','Canadian Solar','CS3W-415MS','Unit',20,80,155000],
    ['PRD-006','Inverter','Hybrid','Deye','SUN-5K-SG04LP1','Unit',3,20,650000],
    ['PRD-007','Cable','DC Solar Cable','Prysmian','4mm² Red','Metre',100,2000,450],
    ['PRD-008','Charge Controller','MPPT','Victron','SmartSolar MPPT 100/30','Unit',3,20,185000],
    ['PRD-009','Solar Panel','Bifacial','LONGi','Hi-MO 5 450W','Unit',10,50,185000],
  ];
  prods.forEach(([id,cat,sub,brand,model,unit,mn,mx,cost]) => {
    insertProd.run(id,cat,sub,brand,model,unit,mn,mx,cost,'Approved',saId,saId,now,now);
  });
  insertProd.run('PRD-010','Battery','Gel','Luminous','200Ah 12V Gel','Unit',8,40,95000,'Pending',adId,null,null,now);

  const mvs = [
    ['MV-001','2025-01-05','PRD-001','Purchase (IN)',5,'SolarWorld NG',adId],
    ['MV-002','2025-01-10','PRD-004','Purchase (IN)',20,'Jinko Direct',adId],
    ['MV-003','2025-01-18','PRD-001','Used in Project (OUT)',2,'PRJ-001',ad2Id],
    ['MV-004','2025-02-10','PRD-006','Used in Project (OUT)',1,'PRJ-002',adId],
    ['MV-005','2025-02-18','PRD-003','Purchase (IN)',10,'Trojan Distributor',adId],
    ['MV-006','2025-03-01','PRD-005','Purchase (IN)',15,'Canadian Solar Rep',ad2Id],
    ['MV-007','2025-03-10','PRD-007','Purchase (IN)',200,'Prysmian NG',adId],
    ['MV-008','2025-03-15','PRD-008','Purchase (IN)',8,'Victron Energy',adId],
  ];
  mvs.forEach(([id,date,pid,type,qty,src,by]) => {
    insertMv.run(id,date,pid,type,qty,src,by,'Approved',saId,now,now);
  });
  insertMv.run('MV-009','2025-04-01','PRD-002','Purchase (IN)',8,'Pylontech Distributor',adId,'Pending',null,null,now);
  insertMv.run('MV-010','2025-04-05','PRD-009','Purchase (IN)',18,'LONGi NG',ad2Id,'Pending',null,null,now);

  const projs = [
    ['PRJ-001','Lekki Residence Solar','Okafor Family, Lekki Ph1','Residential','2025-01-15','2025-01-22','Completed','Chukwu E.',5,'5kWp hybrid system'],
    ['PRJ-002','Abuja Office Power','Sterling Finance, Maitama','Commercial','2025-02-10','2025-02-18','Completed','Ngozi A.',10,'10kWp 3-phase grid-tied'],
    ['PRJ-003','Ibadan School Project','Greenfield Academy, Ibadan','Commercial','2025-03-01','','Active','Adeniyi T.',20,'20kWp with battery autonomy'],
    ['PRJ-004','Farm Irrigation System','Plateau Farms Ltd, Jos','Agricultural','2025-03-20','','Active','Chukwu E.',15,'15kWp pump system'],
    ['PRJ-005','Lagos Street Lighting','Lagos Island LGA','Street Lighting','2025-04-01','','Planning','Ngozi A.',0,'50 solar streetlights'],
  ];
  projs.forEach(([id,name,client,type,start,end,status,mgr,size,notes]) => {
    insertProj.run(id,name,client,type,start,end,status,mgr,size,notes,saId,now);
  });

  const mats = [
    ['PML-001','2025-01-18','PRJ-001','PRD-001',2],
    ['PML-002','2025-01-18','PRJ-001','PRD-004',8],
    ['PML-003','2025-01-18','PRJ-001','PRD-006',1],
    ['PML-004','2025-02-12','PRJ-002','PRD-005',12],
    ['PML-005','2025-02-12','PRJ-002','PRD-006',2],
    ['PML-006','2025-03-05','PRJ-003','PRD-001',6],
  ];
  mats.forEach(([id,date,pj,pd,qty]) => insertMat.run(id,date,pj,pd,qty,saId,now));

  const engs = [
    ['ENG-001','PRJ-001','Chukwu E.','Site Engineer','2025-01-15','2025-01-22','Lead engineer'],
    ['ENG-002','PRJ-001','Bello M.','Solar Installer','2025-01-15','2025-01-22','Panel mounting'],
    ['ENG-003','PRJ-001','Salako T.','Electrical Engineer','2025-01-16','2025-01-22','Wiring & inverter'],
    ['ENG-004','PRJ-002','Ngozi A.','Project Manager','2025-02-10','2025-02-18',''],
    ['ENG-005','PRJ-002','Adeniyi T.','Site Engineer','2025-02-10','2025-02-18',''],
    ['ENG-006','PRJ-003','Adeniyi T.','Project Manager','2025-03-01','','Active'],
    ['ENG-007','PRJ-004','Chukwu E.','Project Manager','2025-03-20','','Active'],
  ];
  engs.forEach(([id,pj,name,role,asgn,comp,notes]) => insertEng.run(id,pj,name,role,asgn,comp,notes,saId,now));

  insertReturn.run('RET-001','2025-02-20','Client Return','PRJ-001','PRD-001',1,'Faulty — no charge','BYD','2025-02-25','',0,'Under warranty',adId,now);
  insertReturn.run('RET-002','2025-03-10','Project Return','PRJ-002','PRD-004',2,'Overordered','','','',1,'Returned to stock',adId,now);
  insertReturn.run('RET-003','2025-04-01','Client Return','PRJ-003','PRD-006',1,'Faulty — no output','Deye','2025-04-05','Replacement approved',0,'Awaiting unit',adId,now);

  const settings = [
    ['currency','NGN'],['timezone','Africa/Lagos'],
    ['company_name','SafeBox Energy'],['company_email','info@safebox.ng'],
    ['low_stock_alert','true'],['require_approval','true']
  ];
  settings.forEach(([k,v]) => insertSetting.run(k,v,now));

  insertAudit.run(uuidv4(),now,saId,'System','Database seeded','system','all','Initial seed data loaded');
});

seed();
console.log('✅ Database seeded successfully.');
console.log('📧 Login: superadmin@safebox.ng / Admin1234!');
console.log('📧 Login: admin@safebox.ng / Admin1234!');
db.close();
