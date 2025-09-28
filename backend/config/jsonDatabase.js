const fs = require('fs').promises;
const path = require('path');

class JsonDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'data');
    this.tables = {};
  }

  async init() {
    try {
      await fs.access(this.dbPath);
    } catch {
      await fs.mkdir(this.dbPath, { recursive: true });
    }

    // Initialize tables
    const tableNames = ['users', 'categories', 'braille_data', 'practice_logs', 'attendance', 'favorites', 'posts', 'comments'];

    for (const tableName of tableNames) {
      await this.initTable(tableName);
    }

    console.log('✅ JSON Database initialized successfully');
  }

  async initTable(tableName) {
    const filePath = path.join(this.dbPath, `${tableName}.json`);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      this.tables[tableName] = JSON.parse(data);
    } catch {
      // Create empty table if file doesn't exist
      this.tables[tableName] = [];
      await this.saveTable(tableName);
    }
  }

  async saveTable(tableName) {
    const filePath = path.join(this.dbPath, `${tableName}.json`);
    await fs.writeFile(filePath, JSON.stringify(this.tables[tableName], null, 2), 'utf8');
  }

  // Simulate SQL-like operations
  async insert(tableName, data) {
    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const id = this.generateId(tableName);
    const record = { id, ...data, created_at: new Date().toISOString() };

    this.tables[tableName].push(record);
    await this.saveTable(tableName);

    return { lastID: id, changes: 1 };
  }

  async select(tableName, where = {}) {
    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    let results = [...this.tables[tableName]];

    // Apply where conditions
    Object.keys(where).forEach(key => {
      results = results.filter(row => row[key] === where[key]);
    });

    return results;
  }

  async selectOne(tableName, where = {}) {
    const results = await this.select(tableName, where);
    return results[0] || null;
  }

  async update(tableName, data, where = {}) {
    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    let changes = 0;
    this.tables[tableName] = this.tables[tableName].map(row => {
      const matches = Object.keys(where).every(key => row[key] === where[key]);
      if (matches) {
        changes++;
        return { ...row, ...data, updated_at: new Date().toISOString() };
      }
      return row;
    });

    await this.saveTable(tableName);
    return { changes };
  }

  async delete(tableName, where = {}) {
    if (!this.tables[tableName]) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const originalLength = this.tables[tableName].length;
    this.tables[tableName] = this.tables[tableName].filter(row => {
      return !Object.keys(where).every(key => row[key] === where[key]);
    });

    const changes = originalLength - this.tables[tableName].length;
    await this.saveTable(tableName);
    return { changes };
  }

  generateId(tableName) {
    const table = this.tables[tableName];
    if (table.length === 0) return 1;
    return Math.max(...table.map(row => row.id || 0)) + 1;
  }

  // Compatibility methods for existing code
  get(sql, params, callback) {
    // This is a simplified implementation for compatibility
    // In a real implementation, you'd parse the SQL
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    // For now, just return null to prevent errors
    setTimeout(() => callback(null, null), 0);
  }

  run(sql, params, callback) {
    // This is a simplified implementation for compatibility
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    // For now, just return success to prevent errors
    setTimeout(() => callback.call({ lastID: 1, changes: 1 }, null), 0);
  }
}

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new JsonDatabase();
  }
  return dbInstance;
}

async function initDatabase() {
  const db = getDb();
  await db.init();
  return db;
}

function closeDb() {
  // Nothing to close for JSON database
  return Promise.resolve();
}

module.exports = {
  getDb,
  closeDb,
  initDatabase
};