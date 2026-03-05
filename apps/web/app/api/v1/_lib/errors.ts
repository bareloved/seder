export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public details?: unknown) {
    super(400, message, "VALIDATION_ERROR");
  }
}
