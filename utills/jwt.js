import jwt from 'jsonwebtoken'

export const generateAccessToken = (userId, roleId, scopes) => {
  return jwt.sign(
    { userId, roleId, scopes, type: 'access' },
    process.env.JWT_SECRET,
    {
      expiresIn: '15m', // Short-lived access token
    }
  )
}

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: '7d', // Long-lived refresh token
    }
  )
}

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded.type !== 'access') {
      return null
    }
    return decoded
  } catch (error) {
    return null
  }
}

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    )
    if (decoded.type !== 'refresh') {
      return null
    }
    return decoded
  } catch (error) {
    return null
  }
}

// Legacy support
export const verifyToken = (token) => {
  return verifyAccessToken(token)
}
