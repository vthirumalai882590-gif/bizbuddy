import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config()

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'focus-42c33',
    })
    console.log('✅ Firebase Admin SDK initialized successfully')
  } catch (err: any) {
    console.error('❌ Error initializing Firebase Admin SDK:', err.message)
  }
}

export const auth = admin.auth()
export default admin
