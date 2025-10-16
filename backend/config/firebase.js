const admin = require('firebase-admin');
const path = require('path');

let db = null;
let auth = null;

function initializeFirebase() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      db = admin.firestore();
      auth = admin.auth();
      return { db, auth };
    }

    // Load service account from environment variables or file
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Method 1: Full JSON in environment variable (for CloudType)
      console.log('🔧 Loading Firebase config from FIREBASE_SERVICE_ACCOUNT env var');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      // Method 2: Individual environment variables (for CloudType)
      console.log('🔧 Loading Firebase config from individual env vars');
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL
      };
    } else {
      // Method 3: Local file (for development)
      console.log('🔧 Loading Firebase config from serviceAccountKey.json file');
      serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    auth = admin.auth();

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('📊 Project ID:', serviceAccount.project_id);

    return { db, auth };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.error('❌ Error details:', error.stack);
    throw error;
  }
}

function getDb() {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

function getAuth() {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}

function closeDb() {
  // Firebase Admin SDK doesn't require explicit closing
  return Promise.resolve();
}

module.exports = {
  initializeFirebase,
  getDb,
  getAuth,
  closeDb
};
