const { getDb, closeDb } = require('../config/database');

const migrateAttendanceTable = () => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    // Check if new columns already exist
    db.all("PRAGMA table_info(attendance)", (err, columns) => {
      if (err) {
        return reject(err);
      }

      const hasCheckInTime = columns.some(col => col.name === 'check_in_time');
      const hasCheckOutTime = columns.some(col => col.name === 'check_out_time');
      const hasIsWorkDay = columns.some(col => col.name === 'is_work_day');
      const hasCreatedAt = columns.some(col => col.name === 'created_at');

      const migrations = [];

      if (!hasCheckInTime) {
        migrations.push("ALTER TABLE attendance ADD COLUMN check_in_time TIME");
      }
      if (!hasCheckOutTime) {
        migrations.push("ALTER TABLE attendance ADD COLUMN check_out_time TIME");
      }
      if (!hasIsWorkDay) {
        migrations.push("ALTER TABLE attendance ADD COLUMN is_work_day BOOLEAN DEFAULT 0");
      }
      if (!hasCreatedAt) {
        migrations.push("ALTER TABLE attendance ADD COLUMN created_at DATETIME");
      }

      if (migrations.length === 0) {
        console.log('✓ Attendance table is already up to date');
        closeDb(db).then(resolve);
        return;
      }

      let completed = 0;
      const errors = [];

      migrations.forEach((migration, index) => {
        db.run(migration, (err) => {
          if (err) {
            console.error(`Error running migration ${index + 1}:`, err.message);
            errors.push(err.message);
          } else {
            console.log(`✓ Migration ${index + 1} completed: ${migration}`);
          }

          completed++;
          if (completed === migrations.length) {
            closeDb(db).then(() => {
              if (errors.length > 0) {
                reject(errors);
              } else {
                console.log('✓ All attendance table migrations completed successfully!');
                resolve();
              }
            });
          }
        });
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  migrateAttendanceTable()
    .then(() => {
      console.log('Attendance table migration complete!');
      process.exit(0);
    })
    .catch((errors) => {
      console.error('Attendance table migration failed:', errors);
      process.exit(1);
    });
}

module.exports = { migrateAttendanceTable };