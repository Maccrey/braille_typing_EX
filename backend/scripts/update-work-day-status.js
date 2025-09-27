const { getDb, closeDb } = require('../config/database');

const updateWorkDayStatus = () => {
  const db = getDb();

  return new Promise((resolve, reject) => {
    // Get all attendance records with check-in and check-out times
    db.all(
      'SELECT id, date, check_in_time, check_out_time FROM attendance WHERE check_in_time IS NOT NULL AND check_out_time IS NOT NULL',
      (err, rows) => {
        if (err) {
          return reject(err);
        }

        console.log(`Found ${rows.length} attendance records to update`);

        let updated = 0;
        let normalWorkDays = 0;
        const errors = [];

        if (rows.length === 0) {
          console.log('No attendance records found to update');
          closeDb(db).then(resolve);
          return;
        }

        rows.forEach((record, index) => {
          // Check if this constitutes a valid work day (9:05 이하 출근 ~ 17:45 이상 퇴근)
          const checkInTime = new Date(`${record.date}T${record.check_in_time}`);
          const checkOutTime = new Date(`${record.date}T${record.check_out_time}`);

          const workDayStart = new Date(`${record.date}T09:05:00`);
          const workDayEnd = new Date(`${record.date}T17:45:00`);

          // 정상 근무: 9:05 이하에 출근 AND 17:45 이상에 퇴근
          const isWorkDay = checkInTime <= workDayStart && checkOutTime >= workDayEnd;

          if (isWorkDay) {
            normalWorkDays++;
          }

          console.log(`${record.date}: ${record.check_in_time} -> ${record.check_out_time} = ${isWorkDay ? 'Normal' : 'Partial'}`);

          // Update the record
          db.run(
            'UPDATE attendance SET is_work_day = ? WHERE id = ?',
            [isWorkDay ? 1 : 0, record.id],
            function(err) {
              if (err) {
                console.error(`Error updating record ${record.id}:`, err.message);
                errors.push(err.message);
              } else {
                updated++;
              }

              // Check if all updates are complete
              if (index === rows.length - 1) {
                closeDb(db).then(() => {
                  if (errors.length > 0) {
                    console.error(`Completed with ${errors.length} errors:`, errors);
                    reject(errors);
                  } else {
                    console.log(`✅ Successfully updated ${updated} attendance records`);
                    console.log(`📊 Total normal work days: ${normalWorkDays}`);
                    console.log(`📊 Total partial work days: ${updated - normalWorkDays}`);
                    resolve({ updated, normalWorkDays, partialWorkDays: updated - normalWorkDays });
                  }
                });
              }
            }
          );
        });
      }
    );
  });
};

// Run if called directly
if (require.main === module) {
  updateWorkDayStatus()
    .then((result) => {
      console.log('Work day status update complete!', result);
      process.exit(0);
    })
    .catch((errors) => {
      console.error('Work day status update failed:', errors);
      process.exit(1);
    });
}

module.exports = { updateWorkDayStatus };