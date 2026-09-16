import { z } from "zod"

const trimmed = (max: number) => z.string().trim().max(max)

export const emailSchema = trimmed(255).email("Enter a valid email address.")

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters."),
})

export const registrationSchema = credentialsSchema.extend({
  name: trimmed(120).min(2, "Enter your name."),
})

export const studentSchema = z.object({
  identifier: trimmed(64).min(1, "Student ID is required."),
  fullName: trimmed(160).min(2, "Full name is required."),
  email: z.union([emailSchema, z.literal("")]).optional().transform((v) => v || null),
  phone: z
    .union([trimmed(40), z.literal("")])
    .optional()
    .transform((v) => v || null),
})

export const classSchema = z.object({
  name: trimmed(120).min(2, "Class name is required."),
  description: z
    .union([trimmed(500), z.literal("")])
    .optional()
    .transform((v) => v || null),
})

export const uuidSchema = z.string().uuid("Invalid identifier.")

export const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused"])

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")

export const attendanceEntrySchema = z.object({
  studentId: uuidSchema,
  status: attendanceStatusSchema,
  note: z
    .union([z.string().trim().max(240), z.literal("")])
    .optional()
    .transform((v) => v || null),
})

export const saveAttendanceSchema = z.object({
  classId: uuidSchema,
  date: isoDateSchema,
  entries: z.array(attendanceEntrySchema).min(1, "Nothing to save."),
})

export const attendanceFilterSchema = z.object({
  classId: uuidSchema.optional(),
  studentId: uuidSchema.optional(),
  date: isoDateSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  status: attendanceStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export type StudentInput = z.infer<typeof studentSchema>
export type ClassInput = z.infer<typeof classSchema>
export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>
export type AttendanceFilter = z.infer<typeof attendanceFilterSchema>
