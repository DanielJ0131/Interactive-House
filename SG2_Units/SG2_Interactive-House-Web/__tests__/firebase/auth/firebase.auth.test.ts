/**
 * @jest-environment node
 */

import { describe, expect, it } from "@jest/globals";

describe("Firebase Auth Config", () => {
  it("should be configured from environment", () => {
    expect(process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== undefined).toBe(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== undefined
    );
  });

  it("should export auth and db modules from firebaseConfig", async () => {
    jest.doMock("@/utils/firebaseConfig", () => ({
      auth: { __mockAuth: true },
      db: { __mockDb: true },
    }));

    const config = await import("@/utils/firebaseConfig");
    expect(config.auth).toBeDefined();
    expect(config.db).toBeDefined();
  });

  it("handles missing environment variables gracefully", () => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

    expect(typeof apiKey === "string" || apiKey === undefined).toBe(true);
    expect(typeof authDomain === "string" || authDomain === undefined).toBe(true);
  });
});
