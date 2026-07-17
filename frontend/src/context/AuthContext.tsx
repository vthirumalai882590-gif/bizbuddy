import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  signInWithRedirect,
  getRedirectResult,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth, googleProvider } from '@/services/firebase'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (data: Partial<User>) => Promise<void>
  signInAsDemo: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<User | null> => {
    const mockUser: User = {
      uid:         fbUser.uid,
      email:       fbUser.email!,
      displayName: fbUser.displayName ?? 'Business Owner',
      photoURL:    fbUser.photoURL ?? undefined,
      language:    'en',
      plan:        'free',
      createdAt:   new Date(),
    }
    return mockUser
  }, [])

  useEffect(() => {
    // Process Google redirect sign-in result on page load
    getRedirectResult(auth)
      .then(async (result: any) => {
        if (result?.user) {
          const profile = await fetchUserProfile(result.user)
          setUser(profile)
        }
      })
      .catch((err: any) => {
        console.error('[Auth] Redirect sign-in error:', err)
      })

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        const profile = await fetchUserProfile(fbUser)
        setUser(profile)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [fetchUserProfile])

  const signInWithGoogle = async () => {
    try {
      await signInWithRedirect(auth, googleProvider)
    } catch (err: any) {
      console.error('Google sign in error:', err)
      throw err
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName })
    await fetchUserProfile(result.user)
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setFirebaseUser(null)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const signInAsDemo = async () => {
    setLoading(true)
    const mockUser: User = {
      uid:         'demo-user',
      email:       'demo@bizbuddy.com',
      displayName: 'Thirumalai',
      language:    'en',
      plan:        'free',
      createdAt:   new Date(),
    }
    setUser(mockUser)
    setLoading(false)
  }

  const updateUserProfile = async (data: Partial<User>) => {
    if (!firebaseUser) throw new Error('Not authenticated')
    setUser((prev) => prev ? { ...prev, ...data } : null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        resetPassword,
        updateUserProfile,
        signInAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}