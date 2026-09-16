/**
 * Application-level errors. Every layer above the services (server actions and
 * the REST API) translates these into user feedback or an HTTP status, so
 * business rules only have to be expressed once.
 */
export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "class_full"
  | "duplicate_enrollment"
  | "duplicate_identifier"
  | "duplicate_email"

const STATUS: Record<AppErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  class_full: 409,
  duplicate_enrollment: 409,
  duplicate_identifier: 409,
  duplicate_email: 409,
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details?: Record<string, string>

  constructor(code: AppErrorCode, message: string, details?: Record<string, string>) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = STATUS[code]
    this.details = details
  }
}

export const unauthorized = (message = "Please sign in to continue.") =>
  new AppError("unauthorized", message)
export const notFound = (what = "Resource") => new AppError("not_found", `${what} not found.`)
export const validation = (message: string, details?: Record<string, string>) =>
  new AppError("validation", message, details)

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/** Shape returned by server actions so forms can render feedback uniformly. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; code?: AppErrorCode; details?: Record<string, string> }

export function toActionResult(error: unknown): ActionResult<never> {
  if (isAppError(error)) {
    return { ok: false, message: error.message, code: error.code, details: error.details }
  }
  console.error(error)
  return { ok: false, message: "Something went wrong. Please try again." }
}
