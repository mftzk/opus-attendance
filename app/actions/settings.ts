"use server"

import { revalidatePath } from "next/cache"
import { requireUser, revokeAllSessions } from "@/lib/auth/session"
import { changePassword, updateProfile } from "@/lib/services/accounts"
import { emailSchema, registrationSchema } from "@/lib/validation/schemas"
import { AppError, toActionResult, validation, type ActionResult } from "@/lib/errors"

function assertNotDemo(isDemo: boolean) {
  if (isDemo) {
    throw new AppError(
      "forbidden",
      "The demo account is shared with other visitors, so its credentials cannot be changed.",
    )
  }
}

export async function updateProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    assertNotDemo(user.isDemo)

    const name = String(formData.get("name") ?? "").trim()
    const email = emailSchema.parse(formData.get("email"))
    if (name.length < 2) throw validation("Enter your name.")

    await updateProfile(user.id, { name, email })
    revalidatePath("/settings")
    return { ok: true, message: "Profile updated." }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function changePasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    assertNotDemo(user.isDemo)

    const current = String(formData.get("currentPassword") ?? "")
    const next = registrationSchema.shape.password.parse(formData.get("newPassword"))
    if (current === next) throw validation("Choose a password you have not used here before.")

    await changePassword(user.id, current, next)
    await revokeAllSessions(user.id)
    return { ok: true, message: "Password changed. Please sign in again." }
  } catch (error) {
    return toActionResult(error)
  }
}
