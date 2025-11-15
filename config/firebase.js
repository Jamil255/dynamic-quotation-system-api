import admin from 'firebase-admin'
import serviceAccount from '../firebase-service-account.json' assert { type: 'json' }
export function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })

      const db = admin.firestore()
      return db
    } else {
      console.warn('Firebase service account not configured')
    }
  } catch (error) {
    console.error(' Firebase initialization failed:', error.message)
  }
}
