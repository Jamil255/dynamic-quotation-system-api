import prisma from '../config/prisma.js'
import { ApiError, ApiResponse } from '../utills/apiResponse.js'
import { generateAccessToken, generateRefreshToken } from '../utills/jwt.js'
import { comparePassword, hashPassword } from '../utills/password.js'

// Public Signup - Creates ADMIN user with new company
export const signupController = async (req, res) => {
  try {
    const { email, userName, password, companyName, companyAddress } = req.body

    if (!email || !userName || !password || !companyName || !companyAddress) {
      throw new ApiError(
        400,
        'All fields are required: email, userName, password, companyName, companyAddress'
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({ where: { email } })

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists')
    }

    // Check if company name is unique
    const existingCompany = await prisma.company.findUnique({
      where: { name: companyName },
    })

    if (existingCompany) {
      throw new ApiError(
        409,
        `Company with name '${companyName}' already exists`
      )
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name: companyName,
        address: companyAddress,
      },
    })

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user as ADMIN
    const user = await prisma.user.create({
      data: {
        email,
        userName,
        password: hashedPassword,
        role: 'ADMIN',
        companyId: company.id,
      },
      select: {
        id: true,
        email: true,
        userName: true,
        role: true,
        companyId: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role, [])
    const refreshToken = generateRefreshToken(user.id)

    // Store tokens in separate collections (non-blocking)
    const accessTokenExpiresAt = new Date()
    accessTokenExpiresAt.setMinutes(accessTokenExpiresAt.getMinutes() + 15)

    const refreshTokenExpiresAt = new Date()
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7)

    Promise.all([
      prisma.accessToken.create({
        data: {
          token: accessToken,
          userId: user.id,
          expiresAt: accessTokenExpiresAt,
        },
      }),
      prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiresAt,
        },
      }),
    ]).catch((err) => console.error('Token storage error:', err))

    const token = {
      accessToken,
      refreshToken,
    }

    res.cookie('authtoken', JSON.stringify(token), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    })

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          user,
          accessToken,
          refreshToken,
        },
        'Admin user and company created successfully'
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Signup failed')
  }
}

// Admin creates USER role for their company
export const createUserController = async (req, res) => {
  try {
    const { email, userName, password, address, role } = req.body

    // Validate required fields
    if (!email || !userName || !password) {
      throw new ApiError(
        400,
        'All fields are required: email, userName, password'
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({ where: { email } })

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists')
    }

    // Get company ID from authenticated admin user
    const companyId = req.user.companyId

    if (!companyId) {
      throw new ApiError(400, 'Admin user must be associated with a company')
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user with same company ID
    const user = await prisma.user.create({
      data: {
        email,
        userName,
        password: hashedPassword,
        address: address || '',
        role: role || 'USER',
        companyId,
      },
      select: {
        id: true,
        email: true,
        userName: true,
        address: true,
        role: true,
        companyId: true,
        createdAt: true,
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
      .status(201)
      .json(
        new ApiResponse(201, user, 'User created successfully for your company')
      )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'User creation failed')
  }
}

// Get all users for admin's company
export const getAllUsersController = async (req, res) => {
  try {
    const companyId = req.user.companyId

    if (!companyId) {
      throw new ApiError(400, 'User must be associated with a company')
    }

    const { search, role: roleFilter, page = 1, limit = 50 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    // Build filter
    const where = { companyId }

    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (roleFilter) {
      where.role = roleFilter
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          userName: true,
          address: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          users,
          totalCount,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / take),
        },
        'Users retrieved successfully'
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to retrieve users')
  }
}

// Get user by ID (admin only)
export const getUserByIdController = async (req, res) => {
  try {
    const { id } = req.params
    const requesterId = req.user.id
    const requesterCompanyId = req.user.companyId

    // Find user
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        userName: true,
        address: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    if (!user) {
      throw new ApiError(404, 'User not found')
    }

    // Ensure admin can only view users from their company
    if (user.companyId !== requesterCompanyId) {
      throw new ApiError(403, 'Access denied')
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, 'User fetched successfully'))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to fetch user')
  }
}

// Update user by ID (admin only)
export const updateUserController = async (req, res) => {
  try {
    const { id } = req.params
    const requesterCompanyId = req.user.companyId
    const { userName, address } = req.body

    // Validate input
    if (!userName || userName.trim() === '') {
      throw new ApiError(400, 'Username is required')
    }

    // Find user first to verify company
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!existingUser) {
      throw new ApiError(404, 'User not found')
    }

    // Ensure admin can only update users from their company
    if (existingUser.companyId !== requesterCompanyId) {
      throw new ApiError(403, 'Access denied')
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        userName: userName.trim(),
        address: address ? address.trim() : null,
      },
      select: {
        id: true,
        email: true,
        userName: true,
        address: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
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
      .json(new ApiResponse(200, updatedUser, 'User updated successfully'))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to update user')
  }
}

// Update user profile
export const updateProfileController = async (req, res) => {
  try {
    const userId = req.user.id
    const { userName, address, email } = req.body

    // Validate input
    if (!userName || userName.trim() === '') {
      throw new ApiError(400, 'Username is required')
    }

    // If email is being updated, check if it's unique
    if (email && email.trim() !== '') {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.trim(),
          NOT: { id: userId },
        },
      })

      if (existingUser) {
        throw new ApiError(409, 'Email already in use by another user')
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        userName: userName.trim(),
        address: address ? address.trim() : null,
        ...(email && email.trim() !== '' && { email: email.trim() }),
      },
      select: {
        id: true,
        email: true,
        userName: true,
        address: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
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
      .json(new ApiResponse(200, updatedUser, 'Profile updated successfully'))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Failed to update profile')
  }
}

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body

    console.log('Login attempt for email:', email)

    // Validate required fields
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required')
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    })

    console.log('User found:', user ? 'Yes' : 'No')

    if (!user) {
      throw new ApiError(401, 'Invalid email or password')
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user?.password)
    console.log('Password valid:', isPasswordValid)

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password')
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role, [])
    const refreshToken = generateRefreshToken(user.id)

    const accessTokenExpiresAt = new Date()
    accessTokenExpiresAt.setMinutes(accessTokenExpiresAt.getMinutes() + 15)

    const refreshTokenExpiresAt = new Date()
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7)

    Promise.all([
      prisma.accessToken.create({
        data: {
          token: accessToken,
          userId: user.id,
          expiresAt: accessTokenExpiresAt,
        },
      }),
      prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: refreshTokenExpiresAt,
        },
      }),
    ]).catch((err) => console.error('Token storage error:', err))

    const token = {
      accessToken,
      refreshToken,
    }
    // Set tokens in cookies
    res.cookie('authtoken', JSON.stringify(token), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    })

    return res.status(201).json(
      new ApiResponse(
        200,
        {
          user: userWithoutPassword,
          accessToken,
          refreshToken,
        },
        'Login successful'
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Login failed')
  }
}

export const logoutController = async (req, res) => {
  try {
    const refreshToken = req.cookies?.authtoken
      ? JSON.parse(req.cookies.authtoken).refreshToken
      : req.body.refreshToken
    const accessToken = req.cookies?.authtoken
      ? JSON.parse(req.cookies.authtoken).accessToken
      : req.headers.authorization?.replace('Bearer ', '')

    console.log(refreshToken, accessToken)
    // Validate that at least one token is provided
    if (!accessToken && !refreshToken) {
      throw new ApiError(400, 'Access token or refresh token is required')
    }

    // Revoke tokens
    const revokePromises = []

    if (accessToken) {
      revokePromises.push(
        prisma.accessToken.updateMany({
          where: {
            token: accessToken,
            isRevoked: false,
          },
          data: {
            isRevoked: true,
          },
        })
      )
    }

    if (refreshToken) {
      revokePromises.push(
        prisma.refreshToken.updateMany({
          where: {
            token: refreshToken,
            isRevoked: false,
          },
          data: {
            isRevoked: true,
          },
        })
      )
    }

    await Promise.all(revokePromises)

    // Clear cookies
    res.clearCookie('authtoken')
    return res.json(new ApiResponse(200, null, 'Logout successful'))
  } catch (error) {
    new ApiError(error?.statusCode, error?.message)
  }
}

export const refreshTokenController = async (req, res) => {
  try {
    // Get refresh token from cookies or body
    const refreshToken = req.cookies?.authtoken
      ? JSON.parse(req.cookies.authtoken).refreshToken
      : req.body.refreshToken

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required')
    }

    // Find and validate refresh token
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userName: true,
            role: true,
            companyId: true,
          },
        },
      },
    })

    if (!tokenRecord) {
      throw new ApiError(
        401,
        'Invalid or expired refresh token. Please login again.'
      )
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(
      tokenRecord.user.id,
      tokenRecord.user.role,
      []
    )

    // Store new access token
    const accessTokenExpiresAt = new Date()
    accessTokenExpiresAt.setMinutes(accessTokenExpiresAt.getMinutes() + 15)

    await prisma.accessToken.create({
      data: {
        token: newAccessToken,
        userId: tokenRecord.user.id,
        expiresAt: accessTokenExpiresAt,
      },
    })

    // Update cookie with new access token
    const token = {
      accessToken: newAccessToken,
      refreshToken: refreshToken,
    }

    res.cookie('authtoken', JSON.stringify(token), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    })

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          accessToken: newAccessToken,
          user: tokenRecord.user,
        },
        'Token refreshed successfully'
      )
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, error?.message || 'Token refresh failed')
  }
}
