import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDolAPtFY1WT8JSjnpqz2bd8ltwphNz2G0',
  authDomain: 'trackmyvan-80c52.firebaseapp.com',
  databaseURL: 'https://trackmyvan-80c52-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId: 'trackmyvan-80c52',
  storageBucket: 'trackmyvan-80c52.firebasestorage.app',
  messagingSenderId: '303143354137',
  appId: '1:303143354137:web:e522f18a4d0b575c560f88',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth - React Native persistence is automatically handled
const auth = getAuth(app);

// Initialize Realtime Database
const firestore = getFirestore(app);

export { auth, firestore };
export default app;
