// Database optimization script - adds indexes and optimizes queries

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting database optimization...');

// Performance optimization queries
const optimizationQueries = [
  // Indexes for frequently queried columns
  'CREATE INDEX IF NOT EXISTS idx_users_username ON Users(username)',
  'CREATE INDEX IF NOT EXISTS idx_categories_created_by ON Categories(created_by)',
  'CREATE INDEX IF NOT EXISTS idx_categories_is_public ON Categories(is_public)',
  'CREATE INDEX IF NOT EXISTS idx_categories_name_search ON Categories(name, is_public)',
  'CREATE INDEX IF NOT EXISTS idx_braille_data_category ON BrailleData(category_id)',
  'CREATE INDEX IF NOT EXISTS idx_practice_logs_user ON PracticeLogs(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_practice_logs_date ON PracticeLogs(practiced_at)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_user ON Attendance(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_attendance_date ON Attendance(date)',
  'CREATE INDEX IF NOT EXISTS idx_favorites_user ON Favorites(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_favorites_category ON Favorites(category_id)',
  'CREATE INDEX IF NOT EXISTS idx_favorites_user_category ON Favorites(user_id, category_id)',

  // Composite indexes for complex queries
  'CREATE INDEX IF NOT EXISTS idx_categories_public_search ON Categories(is_public, name) WHERE is_public = 1',
  'CREATE INDEX IF NOT EXISTS idx_practice_logs_user_date ON PracticeLogs(user_id, practiced_at)',

  // Analyze tables for query optimizer
  'ANALYZE Users',
  'ANALYZE Categories',
  'ANALYZE BrailleData',
  'ANALYZE PracticeLogs',
  'ANALYZE Attendance',
  'ANALYZE Favorites'
];

// Execute optimization queries
async function runOptimization() {
  try {
    for (const query of optimizationQueries) {
      await new Promise((resolve, reject) => {
        db.run(query, (err) => {
          if (err) {
            console.error(`Error executing: ${query}`, err);
            reject(err);
          } else {
            console.log(`✓ ${query}`);
            resolve();
          }
        });
      });
    }

    // Check database integrity
    await new Promise((resolve, reject) => {
      db.all('PRAGMA integrity_check', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database integrity check:', rows[0]);
          resolve();
        }
      });
    });

    // Show database statistics
    await new Promise((resolve, reject) => {
      db.all(`
        SELECT
          name as table_name,
          COUNT(*) as row_count
        FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          console.log('\nDatabase statistics:');
          rows.forEach(row => {
            console.log(`  ${row.table_name}: ${row.row_count} rows`);
          });
          resolve();
        }
      });
    });

    console.log('\n✅ Database optimization completed successfully!');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  runOptimization();
}

module.exports = { runOptimization };