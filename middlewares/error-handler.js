import { ApiError } from '../utills/apiResponse.js'

export const errorHandler = (err, req, res, next) => {
  let error = err

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500
    const message = error.message || 'Internal Server Error'
    error = new ApiError(statusCode, message)
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  }

  res.status(error.statusCode).json(response)
}

export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`)
  next(error)
}
