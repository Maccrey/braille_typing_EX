const firebaseConfig = {
  apiKey: "AIzaSyB8fwHObOl1ZNR1tMnx1sIu-OodqhgeHTc",
  authDomain: "braille-typing-practice.firebaseapp.com",
  projectId: "braille-typing-practice",
  storageBucket: "braille-typing-practice.firebasestorage.app",
  messagingSenderId: "506320406439",
  appId: "1:506320406439:web:cab6de2552d6a1d5b0d882",
  measurementId: "G-JV1J6C31YS"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
