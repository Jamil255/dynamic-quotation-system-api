# Firebase Realtime Notification System

## Setup Instructions

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Get Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create a new one)
3. Go to Project Settings (gear icon) → Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file

### 3. Configure Environment Variables

Add to your `.env` file:

```env
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"..."}
```

**Option 1:** Use JSON string (as shown above)
**Option 2:** Save the JSON file as `firebase-service-account.json` in the root and update `config/firebase.js` to load it

### 4. Enable Realtime Database

1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose location
4. Start in test mode (update rules later)

### 5. Update Database Rules (Security)

```json
{
  "rules": {
    "notifications": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": false
      }
    }
  }
}
```

## Usage Examples

### 1. Send Notification When Invoice is Created

```javascript
import { createNotification } from '../utills/notification.js'

// In your invoice controller
export const createInvoiceController = async (req, res) => {
  // ... create invoice logic

  await createNotification({
    userId: invoice.userId,
    title: 'New Invoice Created',
    content: `Invoice #${invoice.id} has been created successfully`,
    type: 'invoice',
    route: `/invoices/${invoice.id}`,
  })
}
```

### 2. Send Notification When User Signs Up

```javascript
// In signup controller
await createNotification({
  userId: user.id,
  title: 'Welcome!',
  content: `Welcome to the Quotation System, ${user.userName}!`,
  type: 'welcome',
  route: '/dashboard',
})
```

### 3. Send Notification When Company is Updated

```javascript
await createNotification({
  userId: user.id,
  title: 'Company Updated',
  content: `Your company ${companyName} has been updated`,
  type: 'company',
  route: '/company/settings',
})
```

## API Endpoints

### Get All Notifications

```
GET /api/notifications
GET /api/notifications?unseenOnly=true
```

### Mark Notification as Seen

```
PATCH /api/notifications/:notificationId/seen
```

### Delete Notification

```
DELETE /api/notifications/:notificationId
```

### Send Test Notification

```
POST /api/notifications/test
Body: {
  "title": "Test",
  "content": "This is a test",
  "type": "info",
  "route": "/"
}
```

## Client-Side Integration (React/Next.js)

### 1. Install Firebase in Frontend

```bash
npm install firebase
```

### 2. Listen to Real-time Notifications

```javascript
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue } from 'firebase/database'

const firebaseConfig = {
  databaseURL: 'https://your-project-id.firebaseio.com',
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

// Listen to notifications
const userId = 'user-id-here'
const notificationsRef = ref(database, `notifications/${userId}`)

onValue(notificationsRef, (snapshot) => {
  const data = snapshot.val()
  const notifications = data ? Object.values(data) : []
  console.log('New notifications:', notifications)
  // Update your UI with notifications
})
```

## Database Structure

### MongoDB (Prisma)

Stores permanent notification records with full data.

### Firebase Realtime Database

Stores real-time notification data with this structure:

```
notifications/
  {userId}/
    {pushId}/
      id: "mongodb-notification-id"
      user_id: "user-id"
      title: "Notification Title"
      message: "Notification content"
      type: "info"
      route: "/dashboard"
      is_seen: false
      created_at: 1234567890
```

## Notes

- MongoDB is the source of truth
- Firebase is for real-time delivery
- If Firebase fails, MongoDB notification is still saved
- Auth middleware required for notification endpoints
