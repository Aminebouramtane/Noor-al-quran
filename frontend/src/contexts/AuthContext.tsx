import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth, firebaseConfigError } from '../lib/firebase';
import { upsertUserProfile } from '../lib/firebaseCollections';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      void upsertUserProfile(currentUser);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    if (!auth) {
      throw new Error(firebaseConfigError || 'Firebase is not configured correctly');
    }
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error(firebaseConfigError || 'Firebase is not configured correctly');
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error(firebaseConfigError || 'Firebase is not configured correctly');
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!auth) {
      throw new Error(firebaseConfigError || 'Firebase is not configured correctly');
    }
    setLoading(true);
    try {
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signup,
    login,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
