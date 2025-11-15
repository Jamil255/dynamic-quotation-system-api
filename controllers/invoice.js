import prisma from '../config/prisma.js'
import { ApiError, ApiResponse } from '../utills/apiResponse.js'
import { createNotification } from '../utills/notification.js'

// Create Invoice
export const createInvoiceController = async (req, res) => {
  try {
    const {
      customerName,
      companyName,
      devliveryAddress,
      address,
      email,
      phoneNo,
      specialInstructions,
      orderRosurces,
      OrderDate,
      issueDate,
      dueDate,
      paymentMethod,
      advance,
      termsAndConditions,
      productName,
      category,
      unitMeasure,
      quantity,
      unitPrice,
      Discount,
      tax,
      subTotal,
      totalDiscountApplied,
      totalTaxApplied,
      grandTotal,
    } = req.body

    // Validate required fields
    if (
      !customerName ||
      !companyName ||
      !devliveryAddress ||
      !address ||
      !email ||
      !phoneNo ||
      !OrderDate ||
      !issueDate ||
      !dueDate ||
      !paymentMethod ||
      !productName ||
      !category ||
      !unitMeasure ||
      !quantity ||
      !unitPrice
    ) {
      throw new ApiError(400, 'All required fields must be provided')
    }

    // Get user ID from authenticated user
    const userId = req.user.id
    const companyId = req.user.companyId

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        customerName,
        companyName,
        devliveryAddress,
        address,
        email,
        phoneNo,
        specialInstructions: specialInstructions || '',
        orderRosurces: orderRosurces || '',
        OrderDate: new Date(OrderDate),
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        paymentMethod,
        advance: advance || '0',
        termsAndConditions: termsAndConditions || '',
        productName,
        category,
        unitMeasure,
        quantity,
        unitPrice,
        Discount: Discount || 0,
        tax: tax || 0,
        subTotal: subTotal || 0,
        totalDiscountApplied: totalDiscountApplied || 0,
        totalTaxApplied: totalTaxApplied || 0,
        grandTotal: grandTotal || 0,
        userId,
        companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    // Send notification to user
    await createNotification({
      userId,
      title: 'Invoice Created',
      content: `Invoice for ${customerName} has been created successfully with total amount ${grandTotal}`,
      type: 'invoice',
      route: `/invoices/${invoice.id}`,
    })

    return res
      .status(201)
      .json(new ApiResponse(201, invoice, 'Invoice created successfully'))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to create invoice')
  }
}

// Get All Invoices (with pagination and filtering)
export const getAllInvoicesController = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    // Build filter conditions
    const where = {}

    // Filter by user's company
    if (req.user.companyId) {
      where.companyId = req.user.companyId
    }

    // Search filter
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNo: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Get invoices with pagination
    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          user: {
            select: {
              id: true,
              userName: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / take)

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          invoices,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            limit: take,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
          },
        },
        'Invoices retrieved successfully'
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to retrieve invoices')
  }
}

// Get Single Invoice by ID
export const getInvoiceByIdController = async (req, res) => {
  try {
    const { id } = req.params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found')
    }

    // Check if user has access to this invoice
    if (req.user.role !== 'ADMIN' && invoice.companyId !== req.user.companyId) {
      throw new ApiError(403, 'You do not have permission to view this invoice')
    }

    return res
      .status(200)
      .json(new ApiResponse(200, invoice, 'Invoice retrieved successfully'))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to retrieve invoice')
  }
}

// Update Invoice
export const updateInvoiceController = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    })

    if (!existingInvoice) {
      throw new ApiError(404, 'Invoice not found')
    }

    // Check if user has access to update this invoice
    if (existingInvoice.companyId !== req.user.companyId) {
      throw new ApiError(
        403,
        'You do not have permission to update this invoice'
      )
    }

    // Convert date strings to Date objects if provided
    if (updateData.OrderDate) {
      updateData.OrderDate = new Date(updateData.OrderDate)
    }
    if (updateData.issueDate) {
      updateData.issueDate = new Date(updateData.issueDate)
    }
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate)
    }

    // Remove fields that shouldn't be updated
    delete updateData.id
    delete updateData.userId
    delete updateData.companyId
    delete updateData.createdAt

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            userName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedInvoice, 'Invoice updated successfully')
      )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to update invoice')
  }
}

// Delete Invoice
export const deleteInvoiceController = async (req, res) => {
  try {
    const { id } = req.params

    // Check if invoice exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    })

    if (!existingInvoice) {
      throw new ApiError(404, 'Invoice not found')
    }

    // Check if user has access to delete this invoice
    if (
      req.user.role !== 'ADMIN' &&
      existingInvoice.companyId !== req.user.companyId
    ) {
      throw new ApiError(
        403,
        'You do not have permission to delete this invoice'
      )
    }

    // Delete invoice
    await prisma.invoice.delete({
      where: { id },
    })

    return res
      .status(200)
      .json(new ApiResponse(200, { id }, 'Invoice deleted successfully'))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to delete invoice')
  }
}

// Get User's Invoices
export const getUserInvoicesController = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      }),
      prisma.invoice.count({ where: { userId } }),
    ])

    const totalPages = Math.ceil(totalCount / take)

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          invoices,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            limit: take,
          },
        },
        'User invoices retrieved successfully'
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      500,
      error?.message || 'Failed to retrieve user invoices'
    )
  }
}

// Get Invoice Statistics
export const getInvoiceStatsController = async (req, res) => {
  try {
    const companyId = req.user.companyId

    const where = companyId ? { companyId } : {}

    const [totalInvoices, totalRevenue, thisMonthInvoices, thisMonthRevenue] =
      await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.aggregate({
          where,
          _sum: { grandTotal: true },
        }),
        prisma.invoice.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        prisma.invoice.aggregate({
          where: {
            ...where,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { grandTotal: true },
        }),
      ])

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalInvoices,
          totalRevenue: totalRevenue._sum.grandTotal || 0,
          thisMonthInvoices,
          thisMonthRevenue: thisMonthRevenue._sum.grandTotal || 0,
        },
        'Invoice statistics retrieved successfully'
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to retrieve statistics')
  }
}
