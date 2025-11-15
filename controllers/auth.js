import prisma from '../config/prisma.js'
import { ApiError, ApiResponse } from '../utills/apiResponse.js'
import { generateAccessToken, generateRefreshToken } from '../utills/jwt.js'
import { comparePassword, hashPassword } from '../utills/password.js'

// Public Signup - Creates ADMIN user with new company
export const signupController = async (req, res) => {
  try {
    const { email, userName, password, companyName, companyAddress } = req.body

    // Validate required fields
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
    const { email, userName, password, role } = req.body

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
        role: role || 'USER',
        companyId,
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

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body

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

    if (!user) {
      throw new ApiError(401, 'Invalid email or password')
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user?.password)

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
    // console.log(error)
    throw new ApiError(500, error.message)
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
