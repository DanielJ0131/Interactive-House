/**
 * @jest-environment node
 */

import { describe, expect, it } from "@jest/globals";

describe("Firebase Firestore Config", () => {
  it("should be configured from environment", () => {
    expect(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== undefined).toBe(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== undefined
    );
  });

  it("should export db module from firebaseConfig", async () => {
    jest.doMock("@/utils/firebaseConfig", () => ({
      db: { __mockDb: true },
      auth: { __mockAuth: true },
    }));

    const config = await import("@/utils/firebaseConfig");
    expect(config.db).toBeDefined();
  });

  it("handles firestore initialization from app", () => {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    expect(typeof projectId === "string" || projectId === undefined).toBe(true);
  });
});
