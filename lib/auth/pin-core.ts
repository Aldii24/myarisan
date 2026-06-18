import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 32;

export function isValidPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export async function hashPin(pin: string) {
  if (!isValidPin(pin)) {
    throw new Error("PIN must be exactly 4 digits.");
  }

  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(pin, salt, keyLength)) as Buffer;

  return `scrypt:v1:${salt}:${derivedKey.toString("base64url")}`;
}

export async function verifyPin(pin: string, storedHash: string | null) {
  if (!isValidPin(pin) || !storedHash) {
    return false;
  }

  const [algorithm, version, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || version !== "v1" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = (await scrypt(pin, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
