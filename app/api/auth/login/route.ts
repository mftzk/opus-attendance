import { z } from "zod"
import { createSession } from "@/lib/auth/session"
import { authenticate, demoUser } from "@/lib/services/accounts"
import { credentialsSchema } from "@/lib/validation/schemas"
import { fail, ok, readJson } from "@/lib/api/http"

const bodySchema = z.union([
  z.object({ demo: z.literal(true) }),
  credentialsSchema,
])

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await readJson(request))
    const user =
      "demo" in body ? await demoUser() : await authenticate(body.email, body.password)
    await createSession(user.id)
    return ok({ signedIn: true })
  } catch (error) {
    return fail(error)
  }
}
