const { getDb } = require('../config/firebase');
const path = require('path');
const fs = require('fs').promises;

// Download all database data as JSON
// Restore database from uploaded JSON backup
const restoreDatabaseFromBackup = async (req, res) => {
  try {
    console.log('📥 Admin requesting database restore');

    if (!req.file) {
      return res.status(400).json({
        error: 'No backup file uploaded'
      });
    }

    console.log('📄 Processing backup file:', req.file.originalname);

    // Parse the uploaded JSON file
    let backupData;
    try {
      const fileContent = req.file.buffer.toString('utf8');
      backupData = JSON.parse(fileContent);
      console.log('✅ Backup file parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse backup file:', parseError.message);
      return res.status(400).json({
        error: 'Invalid JSON format in backup file'
      });
    }

    // Validate backup structure
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({
        error: 'Invalid backup file structure'
      });
    }

    const db = getDb();
    const collectionNames = ['users', 'categories', 'braille_data', 'practice_logs', 'attendance', 'favorites', 'posts', 'comments'];

    let totalRestored = 0;
    const restoredTables = {};

    // Restore each collection
    for (const collectionName of collectionNames) {
      try {
        if (backupData[collectionName] && Array.isArray(backupData[collectionName])) {
          // Clear existing data
          console.log(`🧹 Clearing existing ${collectionName} data...`);
          const existingSnapshot = await db.collection(collectionName).get();
          const batch = db.batch();
          existingSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();

          // Restore backup data in batches (Firestore batch limit is 500 operations)
          console.log(`📥 Restoring ${collectionName}...`);
          const records = backupData[collectionName];
          const batchSize = 500;

          for (let i = 0; i < records.length; i += batchSize) {
            const batch = db.batch();
            const batchRecords = records.slice(i, i + batchSize);

            batchRecords.forEach(record => {
              const { id, ...data } = record;
              // If record has an id, use it; otherwise let Firestore generate one
              if (id) {
                batch.set(db.collection(collectionName).doc(id), data);
              } else {
                const newDocRef = db.collection(collectionName).doc();
                batch.set(newDocRef, data);
              }
            });

            await batch.commit();
          }

          const recordCount = records.length;
          restoredTables[collectionName] = recordCount;
          totalRestored += recordCount;

          console.log(`✅ Restored ${collectionName}: ${recordCount} records`);
        } else {
          console.log(`⚠️ No valid data found for ${collectionName} in backup`);
          restoredTables[collectionName] = 0;
        }
      } catch (tableError) {
        console.error(`❌ Error restoring ${collectionName}:`, tableError.message);
        restoredTables[collectionName] = 'error';
      }
    }

    console.log(`🎉 Database restoration completed. Total records restored: ${totalRestored}`);

    // Prepare response
    const metadata = backupData._metadata || {};
    res.json({
      message: 'Database successfully restored from backup',
      restoredTables,
      totalRecords: totalRestored,
      backupMetadata: {
        exportDate: metadata.exportDate,
        exportedBy: metadata.exportedBy,
        version: metadata.version,
        originalTotalRecords: metadata.totalRecords
      },
      restoredBy: req.user.username,
      restoredAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database restore error:', error);
    res.status(500).json({
      error: 'Failed to restore database from backup'
    });
  }
};

const downloadDatabaseBackup = async (req, res) => {
  try {
    console.log('📊 Admin requesting database backup download');

    const db = getDb();

    // Read all collections from Firestore
    const backup = {};
    const collectionNames = ['users', 'categories', 'braille_data', 'practice_logs', 'attendance', 'favorites', 'posts', 'comments'];

    for (const collectionName of collectionNames) {
      try {
        const snapshot = await db.collection(collectionName).get();
        backup[collectionName] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`✅ Loaded ${collectionName}: ${backup[collectionName].length} records`);
      } catch (error) {
        console.log(`⚠️ Could not load ${collectionName}: ${error.message}`);
        backup[collectionName] = [];
      }
    }

    // Add metadata
    backup._metadata = {
      exportDate: new Date().toISOString(),
      exportedBy: req.user.username,
      version: '1.0',
      totalRecords: Object.keys(backup).reduce((sum, key) => {
        if (key !== '_metadata' && Array.isArray(backup[key])) {
          return sum + backup[key].length;
        }
        return sum;
      }, 0)
    };

    console.log(`📦 Database backup prepared: ${backup._metadata.totalRecords} total records`);

    // Set headers for file download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `braille-typing-db-backup-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Send the backup data
    res.json(backup);

  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({
      error: 'Failed to create database backup'
    });
  }
};

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    console.log('📊 Admin requesting system statistics');

    const db = getDb();

    const stats = {};
    const collectionNames = ['users', 'categories', 'braille_data', 'practice_logs', 'attendance', 'favorites', 'posts', 'comments'];

    for (const collectionName of collectionNames) {
      try {
        const snapshot = await db.collection(collectionName).get();
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        stats[collectionName] = {
          count: records.length,
          lastUpdated: records.length > 0 ? Math.max(...records.map(r => new Date(r.updated_at || r.created_at || '1970-01-01').getTime())) : null
        };
      } catch (error) {
        console.log(`⚠️ Could not get stats for ${collectionName}: ${error.message}`);
        stats[collectionName] = { count: 0, lastUpdated: null };
      }
    }

    // Calculate total practice time
    try {
      const practiceLogsSnapshot = await db.collection('practice_logs').get();
      const practiceLogs = practiceLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalPracticeTime = practiceLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
      stats.totalPracticeTime = totalPracticeTime;
    } catch (error) {
      stats.totalPracticeTime = 0;
    }

    // Get recent activity (last 7 days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogsSnapshot = await db.collection('practice_logs').get();
      const recentLogs = recentLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const recentActivity = recentLogs.filter(log =>
        new Date(log.created_at) > sevenDaysAgo
      );

      stats.recentActivity = {
        practiceSessionsLast7Days: recentActivity.length,
        practiceTimeLast7Days: recentActivity.reduce((sum, log) => sum + (log.duration_seconds || 0), 0)
      };
    } catch (error) {
      stats.recentActivity = {
        practiceSessionsLast7Days: 0,
        practiceTimeLast7Days: 0
      };
    }

    console.log('✅ System statistics prepared');
    res.json({
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      error: 'Failed to get system statistics'
    });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    console.log('👥 Admin requesting all users');

    const db = getDb();
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Remove password fields for security
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    console.log(`✅ Retrieved ${safeUsers.length} users`);
    res.json({ users: safeUsers });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to get users'
    });
  }
};

// Update user role (admin only)
const updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    console.log(`👤 Admin updating user ${userId} role to ${role}`);

    if (!userId || !role) {
      return res.status(400).json({
        error: 'User ID and role are required'
      });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be "user" or "admin"'
      });
    }

    const db = getDb();

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = { id: userDoc.id, ...userDoc.data() };

    // Update user role
    await db.collection('users').doc(userId).update({
      role: role,
      updated_at: new Date().toISOString()
    });

    console.log(`✅ User ${user.username} role updated to ${role}`);
    res.json({
      message: `User role updated to ${role}`,
      user: {
        id: user.id,
        username: user.username,
        role: role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      error: 'Failed to update user role'
    });
  }
};

module.exports = {
  restoreDatabaseFromBackup,
  downloadDatabaseBackup,
  getSystemStats,
  getAllUsers,
  updateUserRole
};