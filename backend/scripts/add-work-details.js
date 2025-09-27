const { getDb, closeDb } = require('../config/database');

const addWorkDetailsColumn = () => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    // Check if work_details column already exists
    db.all("PRAGMA table_info(attendance)", (err, columns) => {
      if (err) {
        return reject(err);
      }

      const hasWorkDetails = columns.some(col => col.name === 'work_details');

      if (hasWorkDetails) {
        console.log('✓ work_details column already exists');
        closeDb(db).then(resolve);
        return;
      }

      // Add work_details column
      db.run("ALTER TABLE attendance ADD COLUMN work_details TEXT", (err) => {
        if (err) {
          console.error('Error adding work_details column:', err.message);
          closeDb(db).then(() => reject(err));
        } else {
          console.log('✓ work_details column added successfully');
          closeDb(db).then(resolve);
        }
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  addWorkDetailsColumn()
    .then(() => {
      console.log('Work details column addition complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Work details column addition failed:', error);
      process.exit(1);
    });
}

module.exports = { addWorkDetailsColumn };