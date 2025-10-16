const { getDb, getAuth, closeDb, initializeFirebase } = require('./firebase');

module.exports = {
  getDb,
  getAuth,
  closeDb,
  initDatabase: initializeFirebase
};