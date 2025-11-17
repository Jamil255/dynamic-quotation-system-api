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
import { authenticate, role } from '../middlewares/auth.js'

const router = express.Router()

router.use(authenticate)

router.post('/create', createInvoiceController)

router.get('/', getAllInvoicesController)

router.get('/stats', getInvoiceStatsController)

router.get('/my-invoices', getUserInvoicesController)

router.get('/:id', getInvoiceByIdController)

router.put('/:id', updateInvoiceController)

router.delete('/:id', role('ADMIN'), deleteInvoiceController)

export default router
