import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

/** Stored as `scrypt$<salt hex>$<derived key hex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$")
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, "hex")
  const derived = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}
