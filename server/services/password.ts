import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { env } from "../env";

const scrypt = promisify(_scrypt);

const KEY_LENGTH = 64;

/**
 * Mixes in an optional server-side "pepper" (a secret stored only in env
 * vars / a secret manager, never in the database) before hashing. This
 * means a stolen database dump alone is not sufficient to attack password
 * hashes offline — the attacker would also need the pepper.
 */
function withPepper(password: string): string {
  return env.PASSWORD_PEPPER ? `${password}:${env.PASSWORD_PEPPER}` : password;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(withPepper(password), salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;

  const hashBuffer = Buffer.from(hashHex, "hex");
  const derivedKey = (await scrypt(withPepper(password), salt, KEY_LENGTH)) as Buffer;

  if (derivedKey.length !== hashBuffer.length) return false;
  return timingSafeEqual(derivedKey, hashBuffer);
}
