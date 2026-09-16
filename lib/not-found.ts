import { notFound } from "next/navigation"
import { isAppError } from "@/lib/errors"

/**
 * Service calls throw a domain error when a record does not exist or belongs
 * to another account; pages render the 404 screen for both cases so no data
 * about other accounts leaks through the difference.
 */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (error) {
    if (isAppError(error) && (error.code === "not_found" || error.code === "forbidden")) notFound()
    throw error
  }
}
