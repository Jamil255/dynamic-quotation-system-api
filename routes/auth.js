import express from 'express'
import {
  loginController,
  signupController,
  logoutController,
  refreshTokenController,
  createUserController,
} from '../controllers/auth.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const app = express.Router()

// Public routes
app.post('/register', signupController)
app.post('/login', loginController)
app.post('/logout', logoutController)
app.post('/refresh-token', refreshTokenController)

// Protected routes - Admin only
app.post('/create-user', authenticate, authorize('ADMIN'), createUserController)

export default app
