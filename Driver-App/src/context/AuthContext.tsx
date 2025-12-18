import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import { auth, firestore, storage } from '../config/firebaseConfig';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile } from '../types/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  uploadProfilePicture: (uri: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
  uploadProfilePicture: async () => '',
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
          const driverDoc = await getDoc(doc(firestore, 'drivers', user.uid));
          if (driverDoc.exists()) {
            setUserProfile(driverDoc.data() as UserProfile);
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

      // Update Firebase Auth profile with name
      await updateAuthProfile(user, { displayName: name });

      // Store additional driver info in Firestore
      const profileData: UserProfile = {
        email,
        name,
        phone,
        role: 'driver',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, 'drivers', user.uid), profileData);

      // Set the profile in state immediately after signup
      setUserProfile(profileData);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Verify user is a driver
      const driverDoc = await getDoc(doc(firestore, 'drivers', userCredential.user.uid));

      if (!driverDoc.exists()) {
        await signOut(auth);
        throw new Error('This account is not registered as a driver');
      }

      // Set the profile in state
      setUserProfile(driverDoc.data() as UserProfile);
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

  const uploadProfilePicture = async (uri: string): Promise<string> => {
    if (!user) {
      throw new Error('User must be logged in to upload profile picture');
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Validate file size (5MB limit)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }
      
      // Validate file type
      if (!blob.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }
      
      const filename = `profile-pics/${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload with metadata
      await uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/jpeg',
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString(),
        },
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error: any) {
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('User must be logged in to update profile');
    }

    try {
      const driverRef = doc(firestore, 'drivers', user.uid);
      await updateDoc(driverRef, updates);

      // Update Firebase Auth displayName if name is being updated
      if (updates.name && user) {
        await updateAuthProfile(user, { displayName: updates.name });
      }

      // Update local state
      const updatedProfile = { ...userProfile!, ...updates };
      setUserProfile(updatedProfile);
    } catch (error: any) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signUp,
        signIn,
        logout,
        updateUserProfile,
        uploadProfilePicture,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
