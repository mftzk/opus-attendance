"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import { classSchema, uuidSchema } from "@/lib/validation/schemas"
import { createClass, deleteClass, updateClass } from "@/lib/services/classes"
import { enrollStudent, removeEnrollment } from "@/lib/services/enrollments"
import { toActionResult, validation, type ActionResult } from "@/lib/errors"
import { fieldErrors } from "./auth"

export async function createClassAction(
  _prev: ActionResult<{ id: string }> | undefined,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  let createdId: string
  try {
    const user = await requireUser()
    const parsed = classSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
    })
    if (!parsed.success) throw validation("Check the form and try again.", fieldErrors(parsed.error))

    const created = await createClass(user.id, parsed.data)
    createdId = created.id
  } catch (error) {
    return toActionResult(error)
  }
  revalidatePath("/classes")
  revalidatePath("/")
  redirect(`/classes/${createdId}`)
}

export async function updateClassAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const classId = uuidSchema.parse(formData.get("classId"))
    const parsed = classSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
    })
    if (!parsed.success) throw validation("Check the form and try again.", fieldErrors(parsed.error))

    await updateClass(user.id, classId, parsed.data)
    revalidatePath(`/classes/${classId}`)
    revalidatePath("/classes")
    return { ok: true, message: "Class updated." }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteClassAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await deleteClass(user.id, uuidSchema.parse(formData.get("classId")))
  } catch (error) {
    return toActionResult(error)
  }
  revalidatePath("/classes")
  revalidatePath("/")
  redirect("/classes")
}

export async function addStudentToClassAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const classId = uuidSchema.parse(formData.get("classId"))
    const studentId = uuidSchema.parse(formData.get("studentId"))

    const result = await enrollStudent(user.id, classId, studentId)
    revalidatePath(`/classes/${classId}`)
    revalidatePath("/classes")
    revalidatePath("/")
    return { ok: true, message: `Student added successfully. (${result.studentCount}/30)` }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function removeStudentFromClassAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const classId = uuidSchema.parse(formData.get("classId"))
    const studentId = uuidSchema.parse(formData.get("studentId"))

    await removeEnrollment(user.id, classId, studentId)
    revalidatePath(`/classes/${classId}`)
    revalidatePath("/classes")
    revalidatePath("/")
    return { ok: true, message: "Student removed from this class." }
  } catch (error) {
    return toActionResult(error)
  }
}
