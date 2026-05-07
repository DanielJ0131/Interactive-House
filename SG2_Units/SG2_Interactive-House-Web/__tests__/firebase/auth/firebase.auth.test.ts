/**
 * @jest-environment node
 */

import { describe, expect, it, beforeEach } from "@jest/globals";

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ __mocked: true })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ __mocked: true })),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({ __mockAuth: true })),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({ __mockDb: true })),
}));

jest.mock("firebase/ai", () => ({
  getAI: jest.fn(() => ({ __mockAi: true })),
  getGenerativeModel: jest.fn(() => ({ __mockModel: true })),
  GoogleAIBackend: jest.fn(function() {
    this.name = "GoogleAIBackend";
  }),
}));

describe("Firebase Auth Config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads auth and db exports successfully", async () => {
    const config = await import("@/utils/firebaseConfig");
    expect(config.auth).toBeTruthy();
    expect(config.db).toBeTruthy();
  });

  it("exports valid app instance", async () => {
    const config = await import("@/utils/firebaseConfig");
    expect(config.default).toBeDefined();
  });
});
