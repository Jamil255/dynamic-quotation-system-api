import prisma from '../config/prisma.js'
import { ApiError } from '../utills/apiResponse.js'
import { verifyAccessToken } from '../utills/jwt.js'

export const authenticate = async (req, res, next) => {
  try {
    // Get token from cookies or authorization header
    let token = null

    if (req.cookies?.authtoken) {
      const authData = JSON.parse(req.cookies.authtoken)
      token = authData.accessToken
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.replace('Bearer ', '')
    }

    if (!token) {
      throw new ApiError(401, 'Authentication required. Please login.')
    }

    // Verify token signature
    const decoded = verifyAccessToken(token)
    if (!decoded) {
      throw new ApiError(401, 'Invalid or expired token. Please login again.')
    }

    // Check if token exists in database and is not revoked
    const accessToken = await prisma.accessToken.findFirst({
      where: {
        token: token,
        isRevoked: false,
        expiresAt: {
          gt: new Date(), // Token should not be expired
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

    if (!accessToken) {
      throw new ApiError(
        401,
        'Token has been revoked or expired. Please login again.'
      )
    }

    // Attach user and token info to request
    req.user = accessToken.user
    req.token = token
    req.tokenId = accessToken.id

    next()
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        statusCode: error.statusCode,
      })
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      statusCode: 500,
    })
  }
}

// Optional: Role-based authorization middleware
export const role = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        statusCode: 401,
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        statusCode: 403,
      })
    }

    next()
  }
}
