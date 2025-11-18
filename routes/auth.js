import express from 'express'
import {
  createUserController,
  getAllUsersController,
  getUserByIdController,
  loginController,
  logoutController,
  refreshTokenController,
  signupController,
  updateProfileController,
  updateUserController,
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
app.get('/users', authenticate, role('ADMIN'), getAllUsersController)
app.get('/users/:id', authenticate, role('ADMIN'), getUserByIdController)
app.put('/users/:id', authenticate, role('ADMIN'), updateUserController)

// Protected routes - All authenticated users
app.put('/profile', authenticate, updateProfileController)

export default app
