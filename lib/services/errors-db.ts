/** Postgres error helpers shared by the service layer. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const candidate = error as { code?: string; constraint_name?: string } | null
  if (!candidate || candidate.code !== "23505") return false
  return constraint ? candidate.constraint_name === constraint : true
}

export function isCheckViolation(error: unknown, constraint?: string): boolean {
  const candidate = error as { code?: string; constraint_name?: string } | null
  if (!candidate || candidate.code !== "23514") return false
  return constraint ? candidate.constraint_name === constraint : true
}
