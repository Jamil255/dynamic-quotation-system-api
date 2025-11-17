import express from 'express'
import {
  createUserController,
  loginController,
  logoutController,
  refreshTokenController,
  signupController,
} from '../controllers/auth.js'
import { authenticate, role } from '../middlewares/auth.js'

const app = express.Router()

// Public routes
app.post('/register', signupController)
app.post('/login', loginController)
app.post('/logout', logoutController)
app.post('/refresh-token', refreshTokenController)

// Protected routes - Admin only
app.post('/create-user', authenticate, role('ADMIN'), createUserController)

export default app
