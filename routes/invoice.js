import express from 'express'
import {
  createInvoiceController,
  getAllInvoicesController,
  getInvoiceByIdController,
  updateInvoiceController,
  deleteInvoiceController,
  getUserInvoicesController,
  getInvoiceStatsController,
} from '../controllers/invoice.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Create new invoice
router.post('/create', createInvoiceController)

// Get all invoices (with pagination and filtering)
router.get('/', getAllInvoicesController)

// Get invoice statistics
router.get('/stats', getInvoiceStatsController)

// Get user's invoices
router.get('/my-invoices', getUserInvoicesController)

// Get single invoice by ID
router.get('/:id', getInvoiceByIdController)

// Update invoice by ID
router.put('/:id', updateInvoiceController)

// Delete invoice by ID (Admin only)
router.delete('/:id', authorize('ADMIN'), deleteInvoiceController)

export default router
