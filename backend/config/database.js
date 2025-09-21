const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.TEST_DB_PATH || path.join(__dirname, '..', 'database.db');

function getDb() {
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database');
    }
  });
}

function closeDb(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  getDb,
  closeDb
};