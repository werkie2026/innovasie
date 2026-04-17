import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC69Y71m7v-A9Mu4zcYoZz9E8TYYWGlANA",
  authDomain: "my-app-c1549.firebaseapp.com",
  databaseURL: "https://my-app-c1549-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "my-app-c1549",
  storageBucket: "my-app-c1549.firebasestorage.app",
  messagingSenderId: "702045832216",
  appId: "1:702045832216:web:46c350bb41b99634e12f6d",
  measurementId: "G-GFC06QQJ5Q"
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
