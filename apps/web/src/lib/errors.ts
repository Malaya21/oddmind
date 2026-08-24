export class OddMindError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "OddMindError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends OddMindError {
  constructor(code: string, message: string) {
    super(code, message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends OddMindError {
  constructor(code: string, message: string) {
    super(code, message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends OddMindError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(code, message, 403);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends OddMindError {
  constructor(code: string, message: string) {
    super(code, message, 409);
    this.name = "ConflictError";
  }
}

export class ValidationError extends OddMindError {
  constructor(code: string, message: string) {
    super(code, message, 422);
    this.name = "ValidationError";
  }
}

export class NotImplementedError extends OddMindError {
  constructor(message = "Not implemented") {
    super("NOT_IMPLEMENTED", message, 501);
    this.name = "NotImplementedError";
  }
}

export class InvalidTransitionError extends OddMindError {
  constructor(from: string, to: string) {
    super(
      "INVALID_TRANSITION",
      `Cannot transition from ${from} to ${to}`,
      409,
    );
    this.name = "InvalidTransitionError";
  }
}
