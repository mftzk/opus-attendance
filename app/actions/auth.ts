"use server"

import { redirect } from "next/navigation"
import { credentialsSchema, registrationSchema } from "@/lib/validation/schemas"
import { authenticate, demoUser, registerUser } from "@/lib/services/accounts"
import { createSession, destroySession } from "@/lib/auth/session"
import { toActionResult, validation, type ActionResult } from "@/lib/errors"

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const details: Record<string, string> = {}
  for (const issue of error.issues) details[String(issue.path[0] ?? "form")] = issue.message
  return details
}

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const parsed = credentialsSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    })
    if (!parsed.success) throw validation("Check the form and try again.", fieldErrors(parsed.error))

    const user = await authenticate(parsed.data.email, parsed.data.password)
    await createSession(user.id)
  } catch (error) {
    return toActionResult(error)
  }
  redirect("/")
}

export async function demoLoginAction(): Promise<ActionResult> {
  try {
    const user = await demoUser()
    await createSession(user.id)
  } catch (error) {
    return toActionResult(error)
  }
  redirect("/")
}

export async function registerAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const parsed = registrationSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    })
    if (!parsed.success) throw validation("Check the form and try again.", fieldErrors(parsed.error))

    const user = await registerUser(parsed.data)
    await createSession(user.id)
  } catch (error) {
    return toActionResult(error)
  }
  redirect("/")
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect("/login")
}

export { fieldErrors }
