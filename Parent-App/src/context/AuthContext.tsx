import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, firestore } from '../config/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface UserProfile {
  email: string;
  name: string;
  phone: string;
  role: 'parent';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  logout: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Fetch user profile from Firestore when user is authenticated
      if (user) {
        try {
          const parentDoc = await getDoc(doc(firestore, 'parents', user.uid));
          if (parentDoc.exists()) {
            setUserProfile(parentDoc.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile with name
      await updateProfile(user, { displayName: name });

      // Store additional parent info in Firestore
      const profileData: UserProfile = {
        email,
        name,
        phone,
        role: 'parent',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, 'parents', user.uid), profileData);

      // Set the profile in state immediately after signup
      setUserProfile(profileData);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Verify user is a parent
      const parentDoc = await getDoc(doc(firestore, 'parents', userCredential.user.uid));

      if (!parentDoc.exists()) {
        await signOut(auth);
        throw new Error('This account is not registered as a parent');
      }

      // Set the profile in state
      setUserProfile(parentDoc.data() as UserProfile);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signUp, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
