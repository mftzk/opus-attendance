"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import { studentSchema, uuidSchema } from "@/lib/validation/schemas"
import { createStudent, deleteStudent, updateStudent } from "@/lib/services/students"
import { toActionResult, validation, type ActionResult } from "@/lib/errors"
import { fieldErrors } from "./auth"

function parseStudent(formData: FormData) {
  const parsed = studentSchema.safeParse({
    identifier: formData.get("identifier"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  })
  if (!parsed.success) throw validation("Check the form and try again.", fieldErrors(parsed.error))
  return parsed.data
}

export async function createStudentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const student = await createStudent(user.id, parseStudent(formData))
    revalidatePath("/students")
    revalidatePath("/")
    return { ok: true, message: `${student.fullName} was registered.` }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateStudentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const studentId = uuidSchema.parse(formData.get("studentId"))
    await updateStudent(user.id, studentId, parseStudent(formData))
    revalidatePath(`/students/${studentId}`)
    revalidatePath("/students")
    return { ok: true, message: "Student updated." }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteStudentAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await deleteStudent(user.id, uuidSchema.parse(formData.get("studentId")))
  } catch (error) {
    return toActionResult(error)
  }
  revalidatePath("/students")
  revalidatePath("/")
  redirect("/students")
}
