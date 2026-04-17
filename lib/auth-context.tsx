'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, BADGES } from './types';
import emailjs from '@emailjs/browser';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, department: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  addPoints: (points: number, reason: string) => Promise<void>;
  awardBadge: (badgeId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser({ ...userData, id: fbUser.uid });
          
          // Update last login
          await updateDoc(doc(db, 'users', fbUser.uid), {
            lastLogin: serverTimestamp()
          });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, fullName: string, department: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    const newUser: Omit<User, 'id'> = {
      email,
      fullName,
      department,
      role: 'user',
      points: 0,
      badges: [],
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', credential.user.uid), {
      ...newUser,
      createdAt: serverTimestamp()
    });

    // Send welcome email via EmailJS
    try {
      if (process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID && 
          process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID && 
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY) {
        await emailjs.send(
          process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
          process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
          {
            to_email: email,
            to_name: fullName,
            message: 'Welcome to Innovastion! Start sharing your ideas and earn rewards.'
          },
          process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
        );
      }
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    
    await updateDoc(doc(db, 'users', user.id), updates);
    setUser({ ...user, ...updates });
  };

  const addPoints = async (points: number, reason: string) => {
    if (!user) return;
    
    const newPoints = user.points + points;
    await updateDoc(doc(db, 'users', user.id), { points: newPoints });
    setUser({ ...user, points: newPoints });

    // Check for point-based badges
    const pointBadges = BADGES.filter(b => b.pointsRequired && newPoints >= b.pointsRequired);
    for (const badge of pointBadges) {
      if (!user.badges.includes(badge.id)) {
        await awardBadge(badge.id);
      }
    }
  };

  const awardBadge = async (badgeId: string) => {
    if (!user || user.badges.includes(badgeId)) return;
    
    const newBadges = [...user.badges, badgeId];
    await updateDoc(doc(db, 'users', user.id), { badges: newBadges });
    setUser({ ...user, badges: newBadges });

    // Create notification
    await setDoc(doc(db, 'notifications', `${user.id}_badge_${badgeId}_${Date.now()}`), {
      userId: user.id,
      title: 'New Badge Earned!',
      message: `You earned the "${BADGES.find(b => b.id === badgeId)?.name}" badge!`,
      type: 'badge',
      read: false,
      createdAt: serverTimestamp()
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      signIn,
      signUp,
      signOut,
      updateUser,
      addPoints,
      awardBadge
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
