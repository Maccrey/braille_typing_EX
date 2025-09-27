const { getDb, closeDb } = require('./config/database');

const createTables = () => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    // Users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Categories table
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INTEGER NOT NULL,
        is_public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        UNIQUE(name, created_by)
      )
    `;

    // BrailleData table
    const createBrailleDataTable = `
      CREATE TABLE IF NOT EXISTS braille_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        character VARCHAR(255) NOT NULL,
        braille_pattern TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `;

    // PracticeLogs table
    const createPracticeLogsTable = `
      CREATE TABLE IF NOT EXISTS practice_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        duration_seconds INTEGER NOT NULL,
        practiced_at DATE NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Attendance table
    const createAttendanceTable = `
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        check_in_time TIME,
        check_out_time TIME,
        is_work_day BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `;

    // Favorites table
    const createFavoritesTable = `
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        favorited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        UNIQUE(user_id, category_id)
      )
    `;

    // Posts table
    const createPostsTable = `
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id)
      )
    `;

    // Comments table
    const createCommentsTable = `
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        parent_comment_id INTEGER,
        content TEXT NOT NULL,
        author_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id)
      )
    `;

    const tables = [
      { name: 'Users', sql: createUsersTable },
      { name: 'Categories', sql: createCategoriesTable },
      { name: 'BrailleData', sql: createBrailleDataTable },
      { name: 'PracticeLogs', sql: createPracticeLogsTable },
      { name: 'Attendance', sql: createAttendanceTable },
      { name: 'Favorites', sql: createFavoritesTable },
      { name: 'Posts', sql: createPostsTable },
      { name: 'Comments', sql: createCommentsTable }
    ];

    let completed = 0;
    const errors = [];

    tables.forEach(table => {
      db.run(table.sql, function(err) {
        if (err) {
          console.error(`Error creating ${table.name} table:`, err.message);
          errors.push({ table: table.name, error: err.message });
        } else {
          console.log(`✓ ${table.name} table created successfully`);
        }

        completed++;
        if (completed === tables.length) {
          closeDb(db).then(() => {
            if (errors.length > 0) {
              reject(errors);
            } else {
              console.log('All tables created successfully!');
              resolve();
            }
          });
        }
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Database initialization complete!');
      process.exit(0);
    })
    .catch((errors) => {
      console.error('Database initialization failed:', errors);
      process.exit(1);
    });
}

module.exports = { createTables };