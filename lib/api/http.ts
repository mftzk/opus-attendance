import "server-only"
import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { isAppError } from "@/lib/errors"

export const ok = <T>(data: T, status = 200) => NextResponse.json({ data }, { status })

/** Single translation point from domain errors to HTTP responses. */
export function fail(error: unknown): NextResponse {
  if (isAppError(error)) {
    return NextResponse.json(
      { error: error.code, message: error.message, details: error.details },
      { status: error.status },
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "validation",
        message: "The request body is invalid.",
        details: Object.fromEntries(
          error.issues.map((issue) => [String(issue.path[0] ?? "body"), issue.message]),
        ),
      },
      { status: 422 },
    )
  }
  console.error(error)
  return NextResponse.json({ error: "server_error", message: "Something went wrong." }, { status: 500 })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
