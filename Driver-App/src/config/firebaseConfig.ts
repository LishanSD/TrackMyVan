// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDolAPtFY1WT8JSjnpqz2bd8ltwphNz2G0',
  authDomain: 'trackmyvan-80c52.firebaseapp.com',
  databaseURL: 'https://trackmyvan-80c52-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId: 'trackmyvan-80c52',
  storageBucket: 'trackmyvan-80c52.firebasestorage.app',
  messagingSenderId: '303143354137',
  appId: '1:303143354137:web:a86740506f6aa00d560f88',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth - React Native persistence is automatically handled
const auth = getAuth(app);

// Initialize Realtime Database
const database = getDatabase(app);

export { auth, database };
export default app;
