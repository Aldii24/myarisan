import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin-core";

// Auth (tasks.md #4 / #17): PINs must be exactly 4 digits, hashed before
// storage, and verified in constant time. pin-core has no server-only / db
// dependencies, so it is tested directly.

describe("isValidPin", () => {
  test("accepts exactly four digits", () => {
    assert.equal(isValidPin("0000"), true);
    assert.equal(isValidPin("1234"), true);
  });

  test("rejects wrong length or non-digit input", () => {
    for (const bad of ["123", "12345", "12a4", "", " 123", "12 4"]) {
      assert.equal(isValidPin(bad), false, `expected ${JSON.stringify(bad)} invalid`);
    }
  });
});

describe("hashPin", () => {
  test("never stores the PIN in plain text", async () => {
    const stored = await hashPin("1234");
    assert.match(stored, /^scrypt:v1:/);
    assert.ok(!stored.includes("1234"));
  });

  test("uses a random salt so equal PINs hash differently", async () => {
    const a = await hashPin("1234");
    const b = await hashPin("1234");
    assert.notEqual(a, b);
  });

  test("rejects an invalid PIN", async () => {
    await assert.rejects(() => hashPin("12"), /4 digits/);
  });
});

describe("verifyPin", () => {
  test("accepts the correct PIN", async () => {
    const stored = await hashPin("4821");
    assert.equal(await verifyPin("4821", stored), true);
  });

  test("rejects the wrong PIN", async () => {
    const stored = await hashPin("4821");
    assert.equal(await verifyPin("4820", stored), false);
  });

  test("rejects when no hash is stored", async () => {
    assert.equal(await verifyPin("1234", null), false);
  });

  test("rejects an invalid PIN shape without touching the hash", async () => {
    const stored = await hashPin("1234");
    assert.equal(await verifyPin("123", stored), false);
  });

  test("rejects a malformed or foreign hash format", async () => {
    assert.equal(await verifyPin("1234", "bcrypt:v1:salt:hash"), false);
    assert.equal(await verifyPin("1234", "scrypt:v2:salt:hash"), false);
    assert.equal(await verifyPin("1234", "garbage"), false);
  });
});
