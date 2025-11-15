export class ApiError {
  constructor(statusCode, message, errors = []) {
    this.statusCode = statusCode
    this.message = message
    this.errors = errors
    this.success = false
  }
}

export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success = statusCode < 400
  }
}
