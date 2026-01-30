import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBtO5NTyvVUm60G7LCs17DBC5271FCEkB0",
  authDomain: "expensestracker-b451e.firebaseapp.com",
  projectId: "expensestracker-b451e",
  storageBucket: "expensestracker-b451e.firebasestorage.app",
  messagingSenderId: "500724127689",
  appId: "1:500724127689:web:170ade2ffafbb683b33a18"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export admin secret key
export const ADMIN_SECRET_KEY = import.meta.env.VITE_ADMIN_SECRET_KEY;

export { app, db, auth };