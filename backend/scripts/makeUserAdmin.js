const { getDb, initializeFirebase } = require('../config/firebase');

async function makeUserAdmin(username) {
  try {
    console.log('🔧 Initializing Firebase...');
    await initializeFirebase();

    const db = getDb();

    console.log(`👤 Looking for user: ${username}`);
    const usersSnapshot = await db.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log(`❌ User ${username} not found!`);
      console.log('Available users:');

      const allUsersSnapshot = await db.collection('users').get();
      console.log(`Found ${allUsersSnapshot.size} users:`);
      allUsersSnapshot.forEach(doc => {
        const u = doc.data();
        console.log(`  - ${u.username} (ID: ${doc.id}, Role: ${u.role || 'user'})`);
      });

      if (allUsersSnapshot.empty) {
        console.log('No users found in database. Please sign up first.');
      }
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();
    const userId = userDoc.id;

    console.log(`✅ Found user: ${user.username} (ID: ${userId})`);
    console.log(`Current role: ${user.role || 'user'}`);

    if (user.role === 'admin') {
      console.log('👑 User is already an admin!');
      return;
    }

    console.log('🔧 Updating user role to admin...');
    await db.collection('users').doc(userId).update({
      role: 'admin',
      updated_at: new Date().toISOString()
    });

    console.log(`✅ Successfully made ${username} an admin!`);

    // Verify the change
    const updatedUserDoc = await db.collection('users').doc(userId).get();
    const updatedUser = updatedUserDoc.data();
    console.log(`Verification - Role is now: ${updatedUser.role}`);

  } catch (error) {
    console.error('❌ Error making user admin:', error);
  }
}

// Run the script
const username = process.argv[2] || 'maccrey';
console.log(`🚀 Making user '${username}' an admin...`);
makeUserAdmin(username).then(() => {
  console.log('✅ Script completed');
  process.exit(0);
});
