const { getDb } = require('../config/database');
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
    const tableNames = ['users', 'categories', 'braille_data', 'practice_logs', 'attendance', 'favorites', 'posts', 'comments'];

    let totalRestored = 0;
    const restoredTables = {};

    // Restore each table
    for (const tableName of tableNames) {
      try {
        if (backupData[tableName] && Array.isArray(backupData[tableName])) {
          // Clear existing data
          console.log(`🧹 Clearing existing ${tableName} data...`);
          db.tables[tableName] = [];

          // Restore backup data
          console.log(`📥 Restoring ${tableName}...`);
          db.tables[tableName] = [...backupData[tableName]];
          await db.saveTable(tableName);

          const recordCount = backupData[tableName].length;
          restoredTables[tableName] = recordCount;
          totalRestored += recordCount;

          console.log(`✅ Restored ${tableName}: ${recordCount} records`);
        } else {
          console.log(`⚠️ No valid data found for ${tableName} in backup`);
          restoredTables[tableName] = 0;
        }
      } catch (tableError) {
        console.error(`❌ Error restoring ${tableName}:`, tableError.message);
        restoredTables[tableName] = 'error';
      }
    }

    // Clear all cache after restoration
    db.clearAllCache();

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
    const dataPath = path.join(__dirname, '..', 'data');

    // Read all JSON files
    const backup = {};
    const tableNames = ['users', 'categories', 'braille_data', 'practice_logs', 'attendance', 'favorites', 'posts', 'comments'];

    for (const tableName of tableNames) {
      try {
        const filePath = path.join(dataPath, `${tableName}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        backup[tableName] = JSON.parse(data);
        console.log(`✅ Loaded ${tableName}: ${backup[tableName].length} records`);
      } catch (error) {
        console.log(`⚠️ Could not load ${tableName}: ${error.message}`);
        backup[tableName] = [];
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
    const tableNames = ['users', 'categories', 'braille_data', 'practice_logs', 'attendance', 'favorites', 'posts', 'comments'];

    for (const tableName of tableNames) {
      try {
        const records = await db.select(tableName);
        stats[tableName] = {
          count: records.length,
          lastUpdated: records.length > 0 ? Math.max(...records.map(r => new Date(r.updated_at || r.created_at || '1970-01-01').getTime())) : null
        };
      } catch (error) {
        console.log(`⚠️ Could not get stats for ${tableName}: ${error.message}`);
        stats[tableName] = { count: 0, lastUpdated: null };
      }
    }

    // Calculate total practice time
    try {
      const practiceLogs = await db.select('practice_logs');
      const totalPracticeTime = practiceLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      stats.totalPracticeTime = totalPracticeTime;
    } catch (error) {
      stats.totalPracticeTime = 0;
    }

    // Get recent activity (last 7 days)
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentLogs = await db.select('practice_logs');
      const recentActivity = recentLogs.filter(log =>
        new Date(log.created_at) > sevenDaysAgo
      );

      stats.recentActivity = {
        practiceSessionsLast7Days: recentActivity.length,
        practiceTimeLast7Days: recentActivity.reduce((sum, log) => sum + (log.duration || 0), 0)
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
    const users = await db.select('users');

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
    const user = await db.selectOne('users', { id: userId });
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Update user role
    await db.update('users', { role }, { id: userId });

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