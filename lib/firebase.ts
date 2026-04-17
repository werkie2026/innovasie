import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBonX_ovBU9NshbitZRvNmFChOKkgC6Iak",
  authDomain: "app2-491de.firebaseapp.com",
  projectId: "app2-491de",
  storageBucket: "app2-491de.firebasestorage.app",
  messagingSenderId: "395418927138",
  appId: "1:395418927138:web:e849a494913af9902b8a7b",
  measurementId: "G-P5S3NZPY2S"
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
