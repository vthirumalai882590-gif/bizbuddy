import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import dotenv from 'dotenv'
dotenv.config()

let app: App

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'focus-42c33'

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      app = initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
        projectId,
      })
    } else {
      app = initializeApp({ projectId })
    }
    console.log('✅ Firebase Admin SDK initialized')
  } catch (err: any) {
    console.error('❌ Error initializing Firebase Admin SDK:', err.message)
    // Safe mock fallback initialization to prevent process-level import crash
    app = initializeApp({ projectId }, 'fallback-app')
  }
} else {
  app = getApps()[0]!
}

export const auth = getAuth(app)
export default app
