const { getDb, initDatabase } = require('../config/database');

async function makeUserAdmin(username) {
  try {
    console.log('🔧 Initializing database...');
    await initDatabase();

    const db = getDb();

    console.log(`👤 Looking for user: ${username}`);
    const user = await db.selectOne('users', { username });

    if (!user) {
      console.log(`❌ User ${username} not found!`);
      console.log('Available users:');
      const allUsers = await db.select('users');
      console.log(`Found ${allUsers.length} users:`);
      allUsers.forEach(u => console.log(`  - ${u.username} (ID: ${u.id}, Role: ${u.role || 'user'})`));

      if (allUsers.length === 0) {
        console.log('No users found in database. Please sign up first.');
      }
      return;
    }

    console.log(`✅ Found user: ${user.username} (ID: ${user.id})`);
    console.log(`Current role: ${user.role || 'user'}`);

    if (user.role === 'admin') {
      console.log('👑 User is already an admin!');
      return;
    }

    console.log('🔧 Updating user role to admin...');
    await db.update('users', { role: 'admin' }, { id: user.id });

    console.log(`✅ Successfully made ${username} an admin!`);

    // Verify the change
    const updatedUser = await db.selectOne('users', { id: user.id });
    console.log(`Verification - Role is now: ${updatedUser.role}`);

  } catch (error) {
    console.error('❌ Error making user admin:', error);
  }
}

// Run the script
const username = process.argv[2] || 'maccrey';
console.log(`🚀 Making user '${username}' an admin...`);
makeUserAdmin(username);