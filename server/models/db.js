const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/zhipai.db');
let db = null;

const initDB = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      chips INTEGER DEFAULT 1000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      password TEXT,
      owner_id INTEGER,
      big_blind INTEGER DEFAULT 10,
      status TEXT DEFAULT 'waiting',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      result TEXT
    )
  `);

  saveDB();
  console.log('Database initialized');
};

const saveDB = () => {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      resolve(rows);
    } catch (err) {
      reject(err);
    }
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      db.run(sql, params);
      saveDB();
      resolve({ lastID: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0, changes: db.getRowsModified() });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { initDB, query, run };