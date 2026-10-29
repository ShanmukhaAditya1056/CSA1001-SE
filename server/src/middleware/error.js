// DevTrack Standardized API Error Handler
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred.';
  const details = err.details || [];

  // Do not expose stack traces in production
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[SERVER ERROR]:', err);
  }

  res.status(statusCode).json({
    data: null,
    error: {
      code,
      message,
      details
    }
  });
}

export class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details = []) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Insufficient permissions for this project operation') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(resource = 'Resource') {
    return new ApiError(404, 'NOT_FOUND', `${resource} not found`);
  }

  static conflict(message) {
    return new ApiError(409, 'CONFLICT', message);
  }
}
