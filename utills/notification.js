import prisma from '../config/prisma.js'
import { initializeFirebase } from '../config/firebase.js'
import admin from 'firebase-admin'

/**
 * Create notification in both MongoDB and Firebase Realtime Database
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - User ID to send notification to
 * @param {string} params.title - Notification title
 * @param {string} params.content - Notification content/message
 * @param {string} [params.type] - Notification type (optional)
 * @param {string} [params.route] - Route to navigate when clicked (optional)
 * @param {boolean} [params.isSeen=false] - Whether notification is seen
 */
export async function createNotification({
  userId,
  title,
  content,
  type = 'info',
  route = '/',
  isSeen = false,
}) {
  const now = new Date()

  try {
    // 1. Save to MongoDB
    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        date: now,
        time: now,
        isSeen,
        type,
        route,
        userId,
      },
    })

    // 2. Save to Firebase Realtime Database
    try {
      const db = initializeFirebase()
      const docRef = db.collection('notifications').doc()

      await docRef.set({
        id: docRef.id,
        user_id: userId,
        title,
        message: content,
        type,
        route,
        is_seen: isSeen,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log(` Notification created for user ${userId}`)
    } catch (firebaseError) {
      console.warn(' Firebase notification failed:', firebaseError.message)
    }

    return notification
  } catch (error) {
    console.log(error)
    console.error(' Failed to create notification:', error)
    throw error
  }
}
