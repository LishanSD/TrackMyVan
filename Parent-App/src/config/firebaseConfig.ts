import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const firestore = getFirestore(app);

// Initialize Realtime Database
const database = getDatabase(app);

// Initialize Firebase Storage
const storage = getStorage(app);

export { auth, firestore, database, storage };
export default app;
