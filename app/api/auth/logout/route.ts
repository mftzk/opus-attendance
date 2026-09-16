import { destroySession } from "@/lib/auth/session"
import { fail, ok } from "@/lib/api/http"

export async function POST() {
  try {
    await destroySession()
    return ok({ signedOut: true })
  } catch (error) {
    return fail(error)
  }
}
